import express from 'express';
import { listDelegaciones } from '../controllers/delegacionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));
router.get('/', listDelegaciones);

export default router;
