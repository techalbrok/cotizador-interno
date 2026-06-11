# Documentacion de despliegue para Hostinger y plataformas similares.

## Configuracion en el hPanel de Hostinger

Para la aplicacion Node.js en `cotizadorinterno.albroxfera.es`:

| Campo | Valor |
|---|---|
| Application root | `cotizadorinterno.albroxfera.es/nodejs` |
| Application startup file | `server/src/server.js` (NO `server.js`, ya no existe) |
| Application URL | `cotizadorinterno.albroxfera.es` |
| Node.js version | 20.x o 22.x |
| Environment variables | JWT_SECRET, APP_ENCRYPTION_KEY, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, NODE_ENV=production |

NO configurar:
- "Output Directory" / "Build output" → no aplica, el server sirve el `dist/` directamente
- "Build command" custom → con `npm run build` el `vite build` genera `dist/` automaticamente
- Application startup file = `server.js` → ese archivo ya no existe en el repo

## Variables de entorno requeridas

| Variable | Obligatoria | Descripcion |
|---|---|---|
| `JWT_SECRET` | Si | Secreto para firmar JWT. Min 32 chars. Distinto de APP_ENCRYPTION_KEY. |
| `APP_ENCRYPTION_KEY` | Si | Clave para cifrar contrasenas SMTP. Min 32 chars. |
| `DB_HOST` | Si | Host de MySQL (ej. `srv1425.hstgr.io`) |
| `DB_USER` | Si | Usuario de la BD |
| `DB_PASSWORD` | Si | Contrasena de la BD |
| `DB_NAME` | Si | Nombre de la BD (suele tener prefijo del hosting) |
| `NODE_ENV` | Recomendado | `production` para activar el modo estable |
| `PORT` | No | Hostinger lo asigna. Por defecto 3000. |
| `SMTP_*` | Opcional | Si usas SMTP del .env del server (alternativa: configuracion por usuario) |
| `OPENROUTER_API_KEY` | Si | Para el OCR de polizas via IA |
| `APP_URL` | Recomendado | URL publica, usada en los emails |

## Comportamiento al arrancar

El server (`server/src/server.js`) sigue esta secuencia:

1. Lee `process.env.PORT` (o usa 3000).
2. Loguea PID, hostname, puerto, secrets presentes.
3. Llama a `safeStep(validateSecurityConfiguration)` — falla? Warning, sigue.
4. Llama a `safeStep(ensureUserSmtpSchema)` — auto-repara columnas/FKs/ENUM.
5. Registra los handlers de eventos (email async).
6. Si NODE_ENV=production: sirve `dist/` estaticamente.
7. En `/api/health` expone `pid`, `uptime`, `memoryMb`, `nodeVersion`, hostname.
8. En `/api/health/ready` exige secrets configurados (503 si faltan).
9. Escucha en `0.0.0.0:$PORT`.
10. Heartbeat cada 60s en logs.

## Diagnostico rapido

```bash
# Local
curl http://127.0.0.1:3000/api/health

# Produccion
curl https://cotizadorinterno.albroxfera.es/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "pid": 12345,
  "hostname": "...",
  "uptime": 60,
  "env": "production",
  "hasJwtSecret": true,
  "hasEncryptionKey": true,
  "hasDbConfig": true
}
```

Si devuelve 503, mira el panel de Hostinger → "Application logs".

## Local con Docker-like (opcional)

Si quieres probar el deploy en local antes de subir a Hostinger:

```bash
# Build
npm install
npm run build

# Arrancar
NODE_ENV=production JWT_SECRET=dev_secret_32_chars_xxxxx APP_ENCRYPTION_KEY=dev_key_32_chars_xxxxx \
  DB_HOST=localhost DB_USER=root DB_PASSWORD= DB_NAME=albroksa_cotizador \
  npm start

# Probar
curl http://127.0.0.1:3000/api/health
```

## Errores comunes

| Error | Causa | Solucion |
|---|---|---|
| 503 en `/api/health` | App no arranca | Mira logs del panel: secrets faltantes, BD inalcanzable, error de sintaxis |
| 503 con HTML "Service Unavailable" | Proxy de Hostinger no encuentra el proceso | Verifica Application startup file = `server/src/server.js` |
| Cold start > 5s | BD lenta o red saturada | Revisa el dashboard de Hostinger; los secrets del .env |
| Heartbeats cada 60s con PIDs distintos | LiteSpeed reciclando el proceso | Cambia a "persistent process" en el hPanel o escala a soporte |
| 404 en rutas del frontend | dist/ no esta en el deploy | Corre `npm run build` antes de subir; o usa `start.sh` que lo construye auto |
| "CORS policy" en el navegador | `FRONTEND_URL` no apunta a tu dominio | Ajusta `server/src/app.js:46` con el origen correcto |

## Verificacion post-deploy

1. `curl -I https://cotizadorinterno.albroxfera.es/api/health` → 200 OK
2. Hard refresh en navegador (Ctrl+Shift+R) en `https://cotizadorinterno.albroxfera.es`
3. Login con un usuario existente
4. Verificar que las metricas del dashboard cargan (consulta a BD)
