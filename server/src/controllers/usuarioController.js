import { findAllUsers, findUserById, createUser, updateUser, toggleUserActive } from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { createUserSchema, updateUserSchema, toggleUserActiveSchema } from '../schemas/userSchemas.js';

const formatZodError = (error) => ({
  message: 'Payload invalido',
  errors: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});

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
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { nombre, email, password, rol, delegacion_id, comision_pactada, delegacion_asignada_id } = parsed.data;

    const password_hash = await bcrypt.hash(password, 10);
    const userId = await createUser({
      nombre,
      email,
      password_hash,
      rol,
      delegacion_id: (rol === 'admin' || rol === 'superadmin') ? null : delegacion_id,
      comision_pactada: comision_pactada ?? 0,
      delegacion_asignada_id: delegacion_asignada_id ?? null,
    });
    res.status(201).json({ id: userId, message: 'Usuario creado correctamente' });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { nombre, email, rol, delegacion_id, comision_pactada, delegacion_asignada_id, password } = parsed.data;

    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const payload = {
      nombre,
      email,
      rol,
      delegacion_id: (rol === 'admin' || rol === 'superadmin') ? null : delegacion_id,
      comision_pactada: comision_pactada ?? user.comision_pactada ?? 0,
      delegacion_asignada_id: delegacion_asignada_id ?? user.delegacion_asignada_id ?? null,
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

    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = randomBytes(12);
    const temporaryPassword = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    const password_hash = await bcrypt.hash(temporaryPassword, 10);

    await updateUser(id, {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      delegacion_id: (user.rol === 'admin' || user.rol === 'superadmin') ? null : user.delegacion_id,
      comision_pactada: user.comision_pactada,
      delegacion_asignada_id: user.delegacion_asignada_id,
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
    const parsed = toggleUserActiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { activo } = parsed.data;

    if (req.user.id === Number(id) && activo === false) {
      return res.status(400).json({ message: 'No puedes desactivar tu propio usuario' });
    }

    await toggleUserActive(id, activo);
    res.json({ message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente` });
  } catch (error) {
    next(error);
  }
};
