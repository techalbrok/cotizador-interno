import express from 'express';
import { getUsers, create, update, toggleActive, resetPassword } from '../controllers/usuarioController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/', getUsers);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/reset-password', resetPassword);
router.patch('/:id/activo', toggleActive);

export default router;
