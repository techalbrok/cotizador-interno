import { getSolicitudes, getSolicitudById, createSolicitud, updateSolicitud, updateEstado, deleteSolicitud, addHistorico, getHistoricoBySolicitud } from '../models/solicitudModel.js';
import { getAdjuntosBySolicitud } from '../models/adjuntoModel.js';
import { getComentariosBySolicitud, createComentario } from '../models/comentarioModel.js';
import { generarReferencia } from '../services/referenciaService.js';
import { enviarEmailCandeleda } from '../services/emailService.js';
import { getEmailDeliveryErrorMessage } from '../utils/emailErrors.js';
import { ensureSolicitudAccess, ensureSolicitudOwnership } from '../utils/solicitudPermissions.js';

export const listSolicitudes = async (req, res, next) => {
  try {
    const { estado, ramo, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const filters = {};
    if (estado) filters.estado = estado;
    if (ramo) filters.ramo = ramo;
    
    // Si es operador, solo ve las de su delegación
    if (req.user.rol === 'operador') {
      filters.delegacion_id = req.user.delegacion_id;
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

    ensureSolicitudAccess(req.user, solicitud, 'No tienes permiso para ver esta solicitud');

    const adjuntos = await getAdjuntosBySolicitud(id);
    const historico = await getHistoricoBySolicitud(id);
    const comentarios = await getComentariosBySolicitud(id);

    res.json({ ...solicitud, adjuntos, historico, comentarios });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const { ramo, datos_formulario, observaciones } = req.body;
    
    if (!ramo || !datos_formulario) {
      return res.status(400).json({ message: 'Ramo y datos del formulario son obligatorios' });
    }

    const referencia = await generarReferencia();

    const solicitudId = await createSolicitud({
      referencia,
      ramo,
      delegacion_origen_id: req.user.delegacion_id,
      creado_por: req.user.id,
      datos_formulario,
      observaciones
    });

    await addHistorico(solicitudId, null, 'Borrador', req.user.id, 'Solicitud creada');

    res.status(201).json({ id: solicitudId, referencia, message: 'Solicitud creada correctamente' });
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

    ensureSolicitudAccess(req.user, solicitud);
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
    const { estado, observacion } = req.body;

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    ensureSolicitudAccess(req.user, solicitud);

    // Validaciones de flujo de estados
    const estadosValidos = ['Borrador', 'Enviada', 'En gestión', 'Respondida', 'Emitida', 'Cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ message: 'Estado no válido' });
    }

    if (req.user.rol === 'operador' && estado !== 'Cancelada') {
      return res.status(403).json({ message: 'Los operadores solo pueden cancelar solicitudes desde este endpoint' });
    }

    if (req.user.rol === 'gestor' && !['En gestión', 'Respondida', 'Emitida', 'Cancelada'].includes(estado)) {
      return res.status(403).json({ message: 'Los gestores no pueden cambiar a este estado' });
    }

    await updateEstado(id, estado);
    await addHistorico(id, solicitud.estado, estado, req.user.id, observacion || `Estado cambiado a ${estado}`);

    res.json({ message: `Estado actualizado a ${estado}` });
  } catch (error) {
    next(error);
  }
};

export const enviar = async (req, res, next) => {
  try {
    const { id } = req.params;

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'Borrador') {
      return res.status(400).json({ message: 'Solo se pueden enviar solicitudes en estado Borrador' });
    }

    ensureSolicitudAccess(req.user, solicitud);
    ensureSolicitudOwnership(req.user, solicitud, 'Solo el creador puede enviar la solicitud');

    try {
      await enviarEmailCandeleda(solicitud, req.user);
    } catch (emailError) {
      return res.status(502).json({ message: `${getEmailDeliveryErrorMessage(emailError)} La solicitud sigue en borrador.` });
    }

    await updateEstado(id, 'Enviada');
    await addHistorico(id, 'Borrador', 'Enviada', req.user.id, 'Solicitud enviada a Candeleda');

    res.json({ message: 'Solicitud enviada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const addComentario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comentario } = req.body;

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    ensureSolicitudAccess(req.user, solicitud);

    if (!comentario || comentario.trim() === '') {
      return res.status(400).json({ message: 'El comentario no puede estar vacío' });
    }

    await createComentario(id, req.user.id, comentario);
    
    // Return updated solicitud
    const adjuntos = await getAdjuntosBySolicitud(id);
    const historico = await getHistoricoBySolicitud(id);
    const comentarios = await getComentariosBySolicitud(id);

    res.json({ ...solicitud, adjuntos, historico, comentarios });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const solicitud = await getSolicitudById(id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'Borrador') {
      return res.status(400).json({ message: 'Solo se pueden eliminar solicitudes en estado Borrador' });
    }

    ensureSolicitudAccess(req.user, solicitud);
    ensureSolicitudOwnership(req.user, solicitud, 'Solo el creador puede eliminar la solicitud');

    await deleteSolicitud(id);
    res.json({ message: 'Solicitud eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};
