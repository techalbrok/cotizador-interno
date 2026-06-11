import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contrasena actual es obligatoria'),
  newPassword: z.string().min(8, 'La nueva contrasena debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'La confirmacion debe tener al menos 8 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'La nueva contrasena y su confirmacion no coinciden',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contrasena debe ser distinta de la actual',
  path: ['newPassword'],
});

export const smtpSettingsSchema = z.object({
  smtp_enabled: z.boolean().optional().default(false),
  smtp_host: z.string().trim().nullable().optional(),
  smtp_port: z.coerce.number().int().positive().optional(),
  smtp_secure: z.boolean().optional().default(false),
  smtp_user: z.string().trim().nullable().optional(),
  smtp_password: z.string().nullable().optional(),
  smtp_from_name: z.string().trim().nullable().optional(),
  smtp_from_email: z.string().trim().email('Email invalido').nullable().optional().or(z.literal('')),
  solicitud_destinatarios_email: z.string().trim().nullable().optional(),
}).passthrough();

export const validateOrRespond = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: 'Payload invalido',
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  req.body = result.data;
  next();
};
