import { getFormularioByRamo } from '../models/formularioModel.js';
import { getDefaultFormularioByRamo } from '../data/formSchemas.js';

const isValidDynamicSchema = (schema) =>
  schema &&
  typeof schema === 'object' &&
  typeof schema.title === 'string' &&
  typeof schema.type === 'string' &&
  Array.isArray(schema.fields);

export const getFormulario = async (req, res, next) => {
  try {
    const { ramo } = req.params;
    const formulario = await getFormularioByRamo(ramo);

    if (formulario && isValidDynamicSchema(formulario.schema_json)) {
      return res.json(formulario.schema_json);
    }

    const defaultSchema = getDefaultFormularioByRamo(ramo);

    if (!defaultSchema) {
      return res.status(404).json({ message: 'Formulario no encontrado para este ramo' });
    }

    res.json(defaultSchema);
  } catch (error) {
    next(error);
  }
};
