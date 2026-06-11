import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import solicitudRoutes from './routes/solicitudRoutes.js';
import adjuntoRoutes from './routes/adjuntoRoutes.js';
import formularioRoutes from './routes/formularioRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import extractRoutes from './routes/extractRoutes.js';
import delegacionRoutes from './routes/delegacionRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middlewares
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
    ? {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/adjuntos', adjuntoRoutes);
app.use('/api/formularios', formularioRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/delegaciones', delegacionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/extract', extractRoutes);

// Error Handler
app.use(errorHandler);

export default app;
