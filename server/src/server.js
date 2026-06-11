import app from './app.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { syncDefaultFormSchemas } from './services/formularioSyncService.js';
import { ensureUserSmtpSchema } from './services/userSmtpSchemaSyncService.js';
import { validateSecurityConfiguration } from './config/secrets.js';
import { getUploadsDirectory } from './utils/uploadStorage.js';
import { registerEmailHandlers } from './events/handlers/emailHandler.js';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = getUploadsDirectory();
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

process.on('uncaughtException', (error) => {
  console.error(`[uncaughtException] PID=${process.pid}`, error);
});
process.on('unhandledRejection', (reason) => {
  console.error(`[unhandledRejection] PID=${process.pid}`, reason);
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
  const START_TIME = Date.now();
  const SERVER_STARTED_AT = new Date().toISOString();

  console.log(`[startup] ===== Iniciando servidor =====`);
  console.log(`[startup] PID=${process.pid}  HOSTNAME=${os.hostname()}  PORT=${PORT}`);
  console.log(`[startup] NODE_ENV=${process.env.NODE_ENV || 'development'}  NODE=${process.version}`);
  console.log(`[startup] CWD=${process.cwd()}`);
  console.log(`[startup] Secrets: JWT=${Boolean(process.env.JWT_SECRET)} ENC=${Boolean(process.env.APP_ENCRYPTION_KEY)} DB=${Boolean(process.env.DB_HOST)}`);
  console.log(`[startup] ================================`);

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
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|gif|webp)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[startup] Sirviendo dist/ desde ${distPath} (no-cache en index, immutable en assets)`);
  } else if (isProduction) {
    console.warn(`[startup] dist/ no existe en ${distPath}. Asegurate de correr "npm run build" antes de "npm start".`);
  }

  app.get('/api/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      pid: process.pid,
      hostname: os.hostname(),
      uptime: Math.round(process.uptime()),
      uptimeMs: process.uptime() * 1000,
      env: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memoryMb: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasEncryptionKey: Boolean(process.env.APP_ENCRYPTION_KEY),
      hasDbConfig: Boolean(process.env.DB_HOST),
      serverStartedAt: SERVER_STARTED_AT,
    });
  });

  app.get('/api/health/ready', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const hasSecrets = Boolean(process.env.JWT_SECRET) && Boolean(process.env.APP_ENCRYPTION_KEY);
    if (hasSecrets) {
      return res.json({ status: 'ready', pid: process.pid });
    }
    return res.status(503).json({
      status: 'not-ready',
      reason: 'Faltan variables de entorno criticas (JWT_SECRET y/o APP_ENCRYPTION_KEY).',
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[startup] Server running on port ${PORT} (PID=${process.pid})`);
    console.log(`[startup] Cold start duration: ${Date.now() - START_TIME}ms`);
  });

  server.on('error', (err) => {
    console.error(`[fatal] server error: ${err.code} ${err.message}`);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  setInterval(() => {
    const mem = process.memoryUsage();
    console.log(
      `[heartbeat] PID=${process.pid} uptime=${Math.round(process.uptime())}s mem.rss=${Math.round(mem.rss / 1024 / 1024)}MB`
    );
  }, 60_000).unref();
}

startServer().catch((error) => {
  console.error('[fatal] No se pudo iniciar el servidor:', error);
  console.error('[fatal] Stack:', error.stack);
  setTimeout(() => process.exit(1), 3000);
});
