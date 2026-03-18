import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail, findUserById, findUserWithPasswordById, updateUserPassword, updateUserSmtpSettings, findUserSmtpSettingsById } from '../models/userModel.js';
import { assertSafeUserSmtpSettings, getUserSmtpSettingsForProfile, normalizeUserSmtpPayload, toPersistedUserSmtpSettings, verifyUserSmtpConfiguration } from '../services/userSmtpService.js';
import { getJwtSecret } from '../config/secrets.js';
import { getEmailDeliveryErrorMessage } from '../utils/emailErrors.js';
import { clearAuthCookie, setAuthCookie } from '../utils/authCookies.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol, delegacion_id: user.delegacion_id },
      getJwtSecret(),
      { expiresIn: '8h' }
    );

    setAuthCookie(res, token);

    res.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        delegacion_id: user.delegacion_id,
        delegacion_nombre: user.delegacion_nombre,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    res.json({ message: 'Sesion cerrada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Debes completar la contrasena actual y la nueva contrasena dos veces' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'La nueva contrasena y su confirmacion no coinciden' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La nueva contrasena debe tener al menos 8 caracteres' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'La nueva contrasena debe ser distinta de la actual' });
    }

    const user = await findUserWithPasswordById(req.user.id);
    if (!user || !user.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'La contrasena actual no es correcta' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, password_hash);

    res.json({ message: 'Contrasena actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const getSmtpSettings = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user || !user.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const settings = await getUserSmtpSettingsForProfile(req.user.id);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSmtpSettings = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user || !user.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const currentSettings = await findUserSmtpSettingsById(req.user.id);
    const normalizedPayload = normalizeUserSmtpPayload(req.body);
    await assertSafeUserSmtpSettings(normalizedPayload);
    const persistedSettings = toPersistedUserSmtpSettings(currentSettings, normalizedPayload);

    await updateUserSmtpSettings(req.user.id, persistedSettings);

    res.json({
      message: 'Configuracion SMTP actualizada correctamente',
      settings: await getUserSmtpSettingsForProfile(req.user.id),
    });
  } catch (error) {
    if (error instanceof Error && error.message) {
      return res.status(400).json({ message: error.message });
    }

    next(error);
  }
};

export const testSmtpSettings = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user || !user.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const currentSettings = await findUserSmtpSettingsById(req.user.id);
    const result = await verifyUserSmtpConfiguration(currentSettings, req.body);

    res.json({
      success: true,
      message: 'Conexion SMTP verificada correctamente',
      result,
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith('Debes')
      || error.message.startsWith('El puerto')
      || error.message.startsWith('El destinatario')
      || error.message.startsWith('El host SMTP')
      || error.message.startsWith('No se pudo resolver')
    )) {
      return res.json({ success: false, message: error.message });
    }

    return res.json({ success: false, message: getEmailDeliveryErrorMessage(error) });
  }
};
