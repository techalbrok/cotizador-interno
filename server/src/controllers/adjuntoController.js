import fs from 'fs';
import path from 'path';
import { createAdjunto, getAdjuntosBySolicitud, getAdjuntoById, deleteAdjunto } from '../models/adjuntoModel.js';
import { getSolicitudById } from '../models/solicitudModel.js';
import { cleanupUploadedFiles, validateUploadedFileSignature } from '../utils/fileValidation.js';
import { ensureSolicitudAccess, ensureSolicitudOwnership } from '../utils/solicitudPermissions.js';
import { getProjectRoot, resolveStoredUploadPath } from '../utils/uploadStorage.js';

export const uploadAdjuntos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const solicitud = await getSolicitudById(id);

    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });
    ensureSolicitudAccess(req.user, solicitud);

    if (solicitud.estado !== 'Borrador') {
      return res.status(400).json({ message: 'Solo se pueden anadir adjuntos a solicitudes en estado Borrador' });
    }

    ensureSolicitudOwnership(req.user, solicitud, 'Solo el creador puede anadir adjuntos');

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'No se han subido archivos' });
    }

    const validationResults = await Promise.all(files.map((file) => validateUploadedFileSignature(file)));
    const failedValidation = validationResults.find((result) => !result.valid);

    if (failedValidation) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({ message: failedValidation.message });
    }

    const adjuntosCreados = [];
    for (const file of files) {
      const absolutePath = resolveStoredUploadPath(file.path);
      const storedPath = path.relative(getProjectRoot(), absolutePath);
      const adjuntoId = await createAdjunto({
        solicitud_id: id,
        nombre_original: file.originalname,
        ruta_servidor: storedPath,
        mimetype: file.mimetype,
        tamanio_bytes: file.size,
      });

      adjuntosCreados.push({ id: adjuntoId, nombre: file.originalname });
    }

    res.status(201).json({ message: 'Archivos subidos correctamente', adjuntos: adjuntosCreados });
  } catch (error) {
    next(error);
  }
};

export const getAdjuntos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const solicitud = await getSolicitudById(id);

    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    ensureSolicitudAccess(req.user, solicitud);

    const adjuntos = await getAdjuntosBySolicitud(id);
    res.json(adjuntos);
  } catch (error) {
    next(error);
  }
};

export const removeAdjunto = async (req, res, next) => {
  try {
    const { adjuntoId } = req.params;
    const adjunto = await getAdjuntoById(adjuntoId);

    if (!adjunto) return res.status(404).json({ message: 'Adjunto no encontrado' });

    const solicitud = await getSolicitudById(adjunto.solicitud_id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });
    ensureSolicitudAccess(req.user, solicitud);

    if (solicitud.estado !== 'Borrador') {
      return res.status(400).json({ message: 'Solo se pueden eliminar adjuntos de solicitudes en estado Borrador' });
    }

    ensureSolicitudOwnership(req.user, solicitud, 'Solo el creador puede eliminar adjuntos');

    try {
      fs.unlinkSync(resolveStoredUploadPath(adjunto.ruta_servidor));
    } catch (err) {
      console.error('Error eliminando archivo fisico:', err);
    }

    await deleteAdjunto(adjuntoId);
    res.json({ message: 'Adjunto eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const downloadAdjunto = async (req, res, next) => {
  try {
    const { adjuntoId } = req.params;
    const adjunto = await getAdjuntoById(adjuntoId);

    if (!adjunto) return res.status(404).json({ message: 'Adjunto no encontrado' });

    const solicitud = await getSolicitudById(adjunto.solicitud_id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });

    ensureSolicitudAccess(req.user, solicitud);

    const absolutePath = resolveStoredUploadPath(adjunto.ruta_servidor);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'El archivo adjunto no esta disponible' });
    }

    res.download(absolutePath, adjunto.nombre_original);
  } catch (error) {
    next(error);
  }
};
