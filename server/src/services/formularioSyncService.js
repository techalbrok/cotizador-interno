import { defaultFormSchemas } from '../data/formSchemas.js';
import { syncFormularioSchema } from '../models/formularioModel.js';

export const syncDefaultFormSchemas = async () => {
  const resultados = [];

  for (const [ramo, schema] of Object.entries(defaultFormSchemas)) {
    const resultado = await syncFormularioSchema(ramo, schema);
    resultados.push({ ramo, ...resultado });
  }

  return resultados;
};
