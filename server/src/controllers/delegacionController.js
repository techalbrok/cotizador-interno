import { getAllDelegaciones, createDelegacion, updateDelegacion, toggleDelegacionActive } from '../models/delegacionModel.js';
import { createDelegacionSchema, updateDelegacionSchema, toggleDelegacionActiveSchema } from '../schemas/userSchemas.js';

const formatZodError = (error) => ({
  message: 'Payload invalido',
  errors: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});

export const listDelegaciones = async (req, res, next) => {
  try {
    const delegaciones = await getAllDelegaciones();
    res.json(delegaciones);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const parsed = createDelegacionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { nombre, email_contacto, parent_delegacion_id } = parsed.data;
    const insertId = await createDelegacion({ nombre, email_contacto, parent_delegacion_id: parent_delegacion_id ?? null });
    res.status(201).json({ id: insertId, nombre, email_contacto, parent_delegacion_id: parent_delegacion_id ?? null, activa: 1 });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateDelegacionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { nombre, email_contacto, parent_delegacion_id } = parsed.data;
    await updateDelegacion(id, { nombre, email_contacto, parent_delegacion_id: parent_delegacion_id ?? null });
    res.json({ message: 'Delegación actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = toggleDelegacionActiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(formatZodError(parsed.error));
    }
    const { activa } = parsed.data;
    await toggleDelegacionActive(id, activa ? 1 : 0);
    res.json({ message: 'Estado de la delegación actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};
