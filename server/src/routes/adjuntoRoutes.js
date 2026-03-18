import express from 'express';
import { downloadAdjunto, removeAdjunto } from '../controllers/adjuntoController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/:adjuntoId/download', downloadAdjunto);
router.delete('/:adjuntoId', removeAdjunto);

export default router;
