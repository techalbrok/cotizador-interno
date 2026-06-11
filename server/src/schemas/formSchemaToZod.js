import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;

const isValidDateString = (value) => {
  if (typeof value !== 'string' || !dateFormatRegex.test(value)) {
    return false;
  }
  let normalized = value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    normalized = `${year}-${month}-${day}`;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const [yyyy, mm, dd] = normalized.split('-');
  return parsed.getUTCFullYear() === Number(yyyy)
    && parsed.getUTCMonth() + 1 === Number(mm)
    && parsed.getUTCDate() === Number(dd);
};

const isFieldValidatable = (type) => (
  type !== 'section' && type !== 'info'
);

const buildFieldSchema = (field) => {
  const { type, required, options } = field;
  let schema;

  switch (type) {
    case 'text':
    case 'textarea':
      schema = z.string();
      break;

    case 'email':
      schema = z.string().refine((val) => emailRegex.test(val), { message: 'Email invalido' });
      break;

    case 'tel':
      schema = z.string().refine((val) => /^[+\d\s()-]{6,}$/.test(val), { message: 'Telefono invalido' });
      break;

    case 'number':
      schema = z.coerce.number({ invalid_type_error: 'Debe ser un numero' });
      break;

    case 'date':
      schema = z.string().refine(isValidDateString, { message: 'Fecha invalida (YYYY-MM-DD o DD/MM/YYYY)' });
      break;

    case 'select':
      if (Array.isArray(options) && options.length > 0) {
        const values = options.map((opt) => String(opt.value));
        schema = z.string().refine((val) => values.includes(val), { message: `Valor debe ser uno de: ${values.join(', ')}` });
      } else {
        schema = z.string();
      }
      break;

    case 'checkbox':
      schema = z.boolean();
      break;

    case 'checkboxGroup':
      schema = z.array(z.string());
      break;

    default:
      schema = z.unknown();
  }

  if (!required) {
    return schema.optional().nullable();
  }

  return schema;
};

export const buildZodSchemaForSolicitud = (formSchema) => {
  if (!formSchema || !Array.isArray(formSchema.fields)) {
    return null;
  }

  const shape = {};
  for (const field of formSchema.fields) {
    if (!field?.name || !isFieldValidatable(field.type)) {
      continue;
    }
    shape[field.name] = buildFieldSchema(field);
  }

  return z.object({
    ramo: z.string().min(1),
    datos_formulario: z.object(shape).passthrough(),
    observaciones: z.string().max(2000).optional().nullable(),
  });
};

export const buildZodSchemaForDatosFormulario = (formSchema) => {
  if (!formSchema || !Array.isArray(formSchema.fields)) {
    return null;
  }

  const shape = {};
  for (const field of formSchema.fields) {
    if (!field?.name || !isFieldValidatable(field.type)) {
      continue;
    }
    shape[field.name] = buildFieldSchema(field);
  }

  return z.object(shape).passthrough();
};
