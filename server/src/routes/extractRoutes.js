import express from 'express';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Modelos gratuitos de OpenRouter con soporte para la tarea
const MODELS = [
  "google/gemini-2.5-pro-experimental:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.5-flash-lite-preview-02-05:free"
];

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurado");

  let lastError;
  for (const model of MODELS) {
    try {
      console.log(`Intentando extraer datos con OpenRouter (Modelo: ${model})...`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Eres un experto asistente de seguros enfocado en la extracción de datos. Tu tarea es extraer la información solicitada de una póliza en formato JSON. Responde SOLO con el JSON válido, sin texto adicional y sin delimitadores de código (como ```json)."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error (model ${model}): ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonStr = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error(`Error con el modelo ${model}:`, error.message);
      lastError = error;
    }
  }
  
  throw lastError;
}

router.post('/', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const { type } = req.body;
    const file = req.file;

    if (!file) {
      return res.json({ success: true, data: {} });
    }

    let extractedText = "";

    if (file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(file.buffer);
      extractedText = pdfData.text;
    } else {
      throw new Error("Para extracción automática, por favor sube un archivo PDF.");
    }

    const prompt = `Tipo de póliza que se está analizando: ${type || 'Desconocido'}
A continuación está el texto extraído del documento PDF de la póliza:
---
${extractedText.substring(0, 15000)}
---
Extrae la información principal del tomador, vehículo, riesgo o datos relevantes que aplicarían a este tipo de seguro.
Devuelve un JSON estrictamente estructurado en base a lo que encuentres. Usa claves representativas para los valores como "nombre", "nif", "direccion", "marca", "modelo", "matricula", "capital_asegurado", etc., dependiendo de los datos encontrados. Si no estás seguro de un campo, omítelo. NO inventes datos.`;

    const extractedData = await callOpenRouter(prompt);

    res.json({ success: true, data: extractedData });
  } catch (error) {
    console.error("OCR Extraction Error:", error);
    next(error);
  }
});

export default router;
