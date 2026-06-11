import app from './app.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncDefaultFormSchemas } from './services/formularioSyncService.js';
import { ensureUserSmtpSchema } from './services/userSmtpSchemaSyncService.js';
import { validateSecurityConfiguration } from './config/secrets.js';
import { getUploadsDirectory } from './utils/uploadStorage.js';
import { registerEmailHandlers } from './events/handlers/emailHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = getUploadsDirectory();
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

const safeStep = async (name, fn) => {
  try {
    await fn();
  } catch (error) {
    console.warn(`[startup] ${name} fallo:`, error.message);
  }
};

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  safeStep('validateSecurityConfiguration', () => validateSecurityConfiguration());
  safeStep('ensureUserSmtpSchema', () => ensureUserSmtpSchema());

  registerEmailHandlers();

  if (process.env.SYNC_FORM_SCHEMAS !== 'false') {
    await safeStep('syncDefaultFormSchemas', async () => {
      const syncResults = await syncDefaultFormSchemas();
      syncResults
        .filter((result) => result.updated)
        .forEach((result) => {
          console.log(`Formulario ${result.ramo} sincronizado a version ${result.version}`);
        });
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[startup] Vite dev middleware activo');
    } catch (viteError) {
      console.warn('[startup] No se pudo cargar Vite (modo dev). Cayendo a dist/ estatico:', viteError.message);
    }
  }

  const distPath = path.join(__dirname, '../../dist');
  if (fs.existsSync(distPath)) {
    const { default: express } = await import('express');
    app.use(express.static(distPath));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[startup] Sirviendo dist/ desde ${distPath}`);
  } else if (isProduction) {
    console.warn(`[startup] dist/ no existe en ${distPath}. Asegurate de correr "npm run build" antes de "npm start".`);
  }

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      env: process.env.NODE_ENV || 'development',
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasEncryptionKey: Boolean(process.env.APP_ENCRYPTION_KEY),
    });
  });

  app.get('/api/health/ready', (req, res) => {
    const hasSecrets = Boolean(process.env.JWT_SECRET) && Boolean(process.env.APP_ENCRYPTION_KEY);
    if (hasSecrets) {
      return res.json({ status: 'ready' });
    }
    return res.status(503).json({
      status: 'not-ready',
      reason: 'Faltan variables de entorno criticas (JWT_SECRET y/o APP_ENCRYPTION_KEY). Configuralas en el panel del hosting.',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[startup] Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((error) => {
  console.error('[fatal] No se pudo iniciar el servidor:', error);
  console.error('[fatal] Stack:', error.stack);
  setTimeout(() => process.exit(1), 3000);
});
