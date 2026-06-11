import { getSolicitudes, getSolicitudById, createSolicitud, updateSolicitud, deleteSolicitud, changeEstadoAtomically, getHistoricoBySolicitud } from '../models/solicitudModel.js';
import { getAdjuntosBySolicitud } from '../models/adjuntoModel.js';
import { getComentariosBySolicitud, createComentario } from '../models/comentarioModel.js';
import { generarReferencia } from '../services/referenciaService.js';
import { isAvisador, isPrivileged, ensureSolicitudAccess, ensureSolicitudOwnership, getVisibleDelegacionIds } from '../utils/solicitudPermissions.js';
import { emitAsync, EVENTS } from '../events/eventBus.js';
import { changeEstadoSchema, addComentarioSchema } from '../schemas/solicitudSchemas.js';

const formatZodError = (error) => ({
  message: 'Payload invalido',
  errors: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});

export const listSolicitudes = async (req, res, next) => {
  try {
    const { estado, ramo, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const filters = {};
    if (estado) filters.estado = estado;
    if (ramo) filters.ramo = ramo;

    if (isPrivileged(req.user)) {
      // superadmin / admin: ven todo, no se aplica filtro de delegación
    } else if (isAvisador(req.user)) {
      filters.creado_por = req.user.id;
    } else {
      const visibleIds = await getVisibleDelegacionIds(req.user);
      if (Array.isArray(visibleIds) && visibleIds.length > 0) {
        filters.delegacion_ids = visibleIds;
      } else if (Array.isArray(visibleIds) && visibleIds.length === 0) {
        return res.json({ data: [], total: 0, page: parseInt(page), totalPages: 0 });
      }
    }

    const result = await getSolicitudes(filters, parseInt(limit), parseInt(offset));
    res.json({
      data: result.data,
      total: result.total,
      page: parseInt(page),
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    next(error);
  }
};

export const getSolicitud = async (req, res, next) => {
  try {
    const { id } = req.params;
    const solicitud = await getSolicitudById(id);

    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    await ensureSolicitudAccess(req.user, solicitud, 'No tienes permiso para ver esta solicitud');

    const adjuntos = await getAdjuntosBySolicitud(id);
    const historico = await getHistoricoBySolicitud(id);
    const onlyPublic = isAvisador(req.user);
    const comentarios = await getComentariosBySolicitud(id, { onlyPublic });

    res.json({ ...solicitud, adjuntos, historico, comentarios });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const { ramo, datos_formulario, observaciones } = req.body;

    let delegacionOrigenId = req.user.delegacion_id;

    if (isAvisador(req.user)) {
      if (!req.user.delegacion_asignada_id) {
        return res.status(400).json({
          message: 'Tu usuario de avisador no tiene una delegación asignada. Contacta con tu gestor.',
        });
      }
      delegacionOrigenId = req.user.delegacion_asignada_id;
    }

    const referencia = await generarReferencia();

    const solicitudId = await createSolicitud({
      referencia,
      ramo,
      delegacion_origen_id: delegacionOrigenId,
      creado_por: req.user.id,
      datos_formulario,
      observaciones: observaciones ?? null
    });

    emitAsync(EVENTS.SOLICITUD_CREADA, { solicitudId, referencia, ramo, user: req.user });

    res.status(201).json({
      id: solicitudId,
      referencia,
      message: isAvisador(req.user)
        ? 'Aviso creado correctamente. Tu delegación lo tramitara.'
        : 'Solicitud creada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { datos_formulario, observaciones } = req.body;

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'Borrador') {
      return res.status(400).json({ message: 'Solo se pueden editar solicitudes en estado Borrador' });
    }

    await ensureSolicitudAccess(req.user, solicitud);
    ensureSolicitudOwnership(req.user, solicitud, 'Solo el creador puede editar la solicitud');

    await updateSolicitud(id, { datos_formulario, observaciones });
    res.json({ message: 'Solicitud actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const changeEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = changeEstadoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { estado, observacion } = parsed.data;

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    await ensureSolicitudAccess(req.user, solicitud);

    if (req.user.rol === 'operador' && estado !== 'Cancelada') {
      return res.status(403).json({ message: 'Los operadores solo pueden cancelar solicitudes desde este endpoint' });
    }

    if (isAvisador(req.user) && estado !== 'Cancelada') {
      return res.status(403).json({ message: 'Los avisadores solo pueden cancelar solicitudes' });
    }

    if (req.user.rol === 'gestor' && !['En gestión', 'Respondida', 'Emitida', 'Cancelada'].includes(estado)) {
      return res.status(403).json({ message: 'Los gestores no pueden cambiar a este estado' });
    }

    const estadoAnterior = solicitud.estado;
    await changeEstadoAtomically({
      id,
      estadoAnterior,
      estadoNuevo: estado,
      usuarioId: req.user.id,
      observacion: observacion || `Estado cambiado a ${estado}`,
    });

    emitAsync(EVENTS.SOLICITUD_ESTADO_CAMBIADO, {
      solicitud: { ...solicitud, estado },
      usuario: req.user,
      estadoAnterior,
      estadoNuevo: estado,
      observacion: observacion || `Estado cambiado a ${estado}`,
    });

    res.json({ message: `Estado actualizado a ${estado}` });
  } catch (error) {
    next(error);
  }
};

export const enviar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isAvisador(req.user)) {
      return res.status(403).json({ message: 'Los avisadores no pueden enviar solicitudes; eso lo hace la delegación asignada' });
    }

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'Borrador') {
      return res.status(400).json({ message: 'Solo se pueden enviar solicitudes en estado Borrador' });
    }

    await ensureSolicitudAccess(req.user, solicitud);
    ensureSolicitudOwnership(req.user, solicitud, 'Solo el creador puede enviar la solicitud');

    await changeEstadoAtomically({
      id,
      estadoAnterior: 'Borrador',
      estadoNuevo: 'Enviada',
      usuarioId: req.user.id,
      observacion: 'Solicitud enviada a Candeleda',
    });

    emitAsync(EVENTS.SOLICITUD_ENVIADA, {
      solicitud: { ...solicitud, estado: 'Enviada' },
      usuario: req.user,
      observacion: 'Solicitud enviada a Candeleda',
    });

    res.json({ message: 'Solicitud enviada correctamente. El email se procesara en segundo plano.' });
  } catch (error) {
    next(error);
  }
};

export const addComentario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = addComentarioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { comentario, es_interno } = parsed.data;

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    await ensureSolicitudAccess(req.user, solicitud);

    if (isAvisador(req.user)) {
      return res.status(403).json({ message: 'Los avisadores no pueden añadir comentarios de gestion' });
    }

    const flagInterno = isAvisador(req.user) ? false : es_interno !== false;

    await createComentario({
      solicitud_id: id,
      usuario_id: req.user.id,
      comentario,
      es_interno: flagInterno,
    });

    emitAsync(EVENTS.SOLICITUD_COMENTARIO_ANADIDO, { solicitudId: id, user: req.user, comentario });

    const adjuntos = await getAdjuntosBySolicitud(id);
    const historico = await getHistoricoBySolicitud(id);
    const comentarios = await getComentariosBySolicitud(id, { onlyPublic: isAvisador(req.user) });

    res.json({ ...solicitud, adjuntos, historico, comentarios });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isAvisador(req.user)) {
      return res.status(403).json({ message: 'Los avisadores no pueden eliminar solicitudes; solicita la cancelacion a tu delegación' });
    }

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'Borrador') {
      return res.status(400).json({ message: 'Solo se pueden eliminar solicitudes en estado Borrador' });
    }

    await ensureSolicitudAccess(req.user, solicitud);
    ensureSolicitudOwnership(req.user, solicitud, 'Solo el creador puede eliminar la solicitud');

    await deleteSolicitud(id);
    res.json({ message: 'Solicitud eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};
