import { getFormularioByRamo } from '../models/formularioModel.js';
import { getDefaultFormularioByRamo } from '../data/formSchemas.js';
import { buildZodSchemaForSolicitud } from '../schemas/formSchemaToZod.js';

const isValidDynamicSchema = (schema) =>
  schema
  && typeof schema === 'object'
  && typeof schema.title === 'string'
  && typeof schema.type === 'string'
  && Array.isArray(schema.fields);

const resolveFormSchema = async (ramo) => {
  const dbForm = await getFormularioByRamo(ramo);
  if (dbForm && isValidDynamicSchema(dbForm.schema_json)) {
    return dbForm.schema_json;
  }
  return getDefaultFormularioByRamo(ramo) || null;
};

export const validateSolicitudPayload = async (req, res, next) => {
  try {
    const { ramo } = req.body || {};

    if (!ramo || typeof ramo !== 'string') {
      return res.status(400).json({ message: 'El campo "ramo" es obligatorio' });
    }

    const formSchema = await resolveFormSchema(ramo);

    if (!formSchema) {
      return res.status(400).json({ message: `No existe esquema de formulario para el ramo "${ramo}"` });
    }

    const zodSchema = buildZodSchemaForSolicitud(formSchema);
    if (!zodSchema) {
      return next();
    }

    const result = zodSchema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return res.status(400).json({
        message: 'El payload no cumple el esquema del ramo',
        errors: issues,
      });
    }

    req.body = result.data;
    req.validatedFormSchema = formSchema;
    next();
  } catch (error) {
    next(error);
  }
};
