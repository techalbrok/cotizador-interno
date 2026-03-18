import express from 'express';
import { getFormulario } from '../controllers/formularioController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/:ramo', getFormulario);

export default router;
