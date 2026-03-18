import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type } = req.body;
    
    // Simulate OCR extraction delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let extractedData = {};
    if (type === 'Auto') {
      extractedData = { marca: 'Toyota', modelo: 'Corolla', conductor: 'Juan Pérez' };
    } else if (type === 'Hogar') {
      extractedData = { direccion: 'Calle Falsa 123', metros_cuadrados: 120, nombre: 'Ana Gómez' };
    } else if (type === 'Comercio') {
      extractedData = { actividad: 'Tienda de Ropa', facturacion: 50000, nombre: 'Carlos Ruiz' };
    } else if (type === 'Salud Extranjería') {
      extractedData = { fecha_nacimiento: '1985-10-20', nacionalidad: 'Mexicana', nombre: 'Laura Torres' };
    }

    res.json({ success: true, data: extractedData });
  } catch (error) {
    next(error);
  }
});

export default router;
