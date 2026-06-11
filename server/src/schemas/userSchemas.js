import { z } from 'zod';

const allowedRoles = ['operador', 'gestor', 'admin', 'superadmin', 'avisador', 'tramitador_central'];

const baseUserSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  email: z.string().trim().toLowerCase().email('Email invalido').max(150),
  rol: z.enum(allowedRoles, { errorMap: () => ({ message: 'Rol no permitido' }) }),
  delegacion_id: z.coerce.number().int().positive().nullable().optional(),
  comision_pactada: z.coerce.number().min(0).max(100).nullable().optional(),
  delegacion_asignada_id: z.coerce.number().int().positive().nullable().optional(),
});

export const createUserSchema = baseUserSchema.extend({
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
}).refine(
  (data) => {
    const privileged = data.rol === 'admin' || data.rol === 'superadmin';
    if (!privileged && !data.delegacion_id) {
      return false;
    }
    return true;
  },
  { message: 'La delegacion es obligatoria para ese rol', path: ['delegacion_id'] }
).refine(
  (data) => {
    if (data.rol === 'avisador' && !data.delegacion_asignada_id) {
      return false;
    }
    return true;
  },
  { message: 'La delegacion asignada es obligatoria para avisadores', path: ['delegacion_asignada_id'] }
);

export const updateUserSchema = baseUserSchema.extend({
  password: z.string().min(8).optional().or(z.literal('')),
}).refine(
  (data) => {
    const privileged = data.rol === 'admin' || data.rol === 'superadmin';
    if (!privileged && !data.delegacion_id) {
      return false;
    }
    return true;
  },
  { message: 'La delegacion es obligatoria para ese rol', path: ['delegacion_id'] }
);

export const toggleUserActiveSchema = z.object({
  activo: z.boolean({ invalid_type_error: 'activo debe ser booleano' }),
});

export const createDelegacionSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  email_contacto: z.string().trim().email('Email invalido').max(150),
  parent_delegacion_id: z.coerce.number().int().positive().nullable().optional(),
});

export const updateDelegacionSchema = createDelegacionSchema;

export const toggleDelegacionActiveSchema = z.object({
  activa: z.boolean({ invalid_type_error: 'activa debe ser booleano' }),
});
