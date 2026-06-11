import express from 'express';
import { listDelegaciones, create, update, toggleActive } from '../controllers/delegacionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/', listDelegaciones);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/activo', toggleActive);

export default router;

