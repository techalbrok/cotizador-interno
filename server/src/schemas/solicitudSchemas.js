import { z } from 'zod';

const ESTADOS_VALIDOS = ['Borrador', 'Enviada', 'En gestión', 'Respondida', 'Emitida', 'Cancelada'];

export const changeEstadoSchema = z.object({
  estado: z.enum(ESTADOS_VALIDOS, { errorMap: () => ({ message: 'Estado no valido' }) }),
  observacion: z.string().max(2000).nullable().optional(),
});

export const addComentarioSchema = z.object({
  comentario: z.string().trim().min(1, 'El comentario no puede estar vacio').max(5000),
  es_interno: z.boolean().optional().default(true),
});
