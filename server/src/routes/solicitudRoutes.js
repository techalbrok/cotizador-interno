import express from 'express';
import multer from 'multer';
import path from 'path';
import { listSolicitudes, getSolicitud, create, update, changeEstado, enviar, remove, addComentario } from '../controllers/solicitudController.js';
import { uploadAdjuntos, getAdjuntos } from '../controllers/adjuntoController.js';
import { authenticate } from '../middleware/auth.js';
import { allowedUploadExtensions, allowedUploadMimeTypes } from '../utils/fileValidation.js';
import { validateSolicitudPayload } from '../middleware/validateSolicitudPayload.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const extensionAllowed = allowedUploadExtensions.includes(extension);
    const mimeTypeAllowed = allowedUploadMimeTypes.includes(file.mimetype);

    if (extensionAllowed && mimeTypeAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG, PNG y DOCX.'));
    }
  },
});

router.use(authenticate);

router.get('/', listSolicitudes);
router.get('/:id', getSolicitud);
router.post('/', validateSolicitudPayload, create);
router.put('/:id', update);
router.put('/:id/estado', changeEstado);
router.post('/:id/enviar', enviar);
router.delete('/:id', remove);
router.post('/:id/comentarios', addComentario);

router.post('/:id/adjuntos', upload.array('archivos', 10), uploadAdjuntos);
router.get('/:id/adjuntos', getAdjuntos);

export default router;
