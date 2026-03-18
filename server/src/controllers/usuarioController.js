import { findAllUsers, findUserById, createUser, updateUser, toggleUserActive } from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const generateTemporaryPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(12);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await findAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const { nombre, email, password, rol, delegacion_id } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ message: 'Nombre, email, contraseña y rol son obligatorios' });
    }

    if (rol !== 'admin' && !delegacion_id) {
      return res.status(400).json({ message: 'La delegación es obligatoria para operadores y gestores' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = await createUser({ nombre, email, password_hash, rol, delegacion_id: rol === 'admin' ? null : delegacion_id });
    res.status(201).json({ id: userId, message: 'Usuario creado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, delegacion_id, password } = req.body;

    if (!nombre || !email || !rol) {
      return res.status(400).json({ message: 'Nombre, email y rol son obligatorios' });
    }

    if (rol !== 'admin' && !delegacion_id) {
      return res.status(400).json({ message: 'La delegación es obligatoria para operadores y gestores' });
    }

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const payload = {
      nombre,
      email,
      rol,
      delegacion_id: rol === 'admin' ? null : delegacion_id,
    };

    if (password) {
      payload.password_hash = await bcrypt.hash(password, 10);
    }

    await updateUser(id, payload);
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const password_hash = await bcrypt.hash(temporaryPassword, 10);

    await updateUser(id, {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      delegacion_id: user.rol === 'admin' ? null : user.delegacion_id,
      password_hash,
    });

    res.json({
      message: 'Contrasena temporal generada correctamente',
      temporaryPassword,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (req.user.id === Number(id) && activo === false) {
      return res.status(400).json({ message: 'No puedes desactivar tu propio usuario' });
    }

    await toggleUserActive(id, activo);
    res.json({ message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente` });
  } catch (error) {
    next(error);
  }
};
