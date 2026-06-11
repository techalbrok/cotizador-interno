import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, getMe, logout, changePassword, getSmtpSettings, updateSmtpSettings, testSmtpSettings } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos de inicio de sesion. Intenta de nuevo en 15 minutos.' },
});

const smtpTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas pruebas SMTP. Espera 15 minutos antes de reintentar.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);
router.get('/smtp-settings', authenticate, getSmtpSettings);
router.put('/smtp-settings', authenticate, updateSmtpSettings);
router.post('/smtp-settings/test', authenticate, smtpTestLimiter, testSmtpSettings);

export default router;
