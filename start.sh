#!/usr/bin/env bash
# Script de arranque para Hostinger u otros hostings compatibles con LSAPI/Passenger.
# Garantiza que dist/ existe (lo construye si falta) y arranca el server Node.
set -e

cd "$(dirname "$0")"

# Si dist/ no existe (por ejemplo, primer deploy sin haber corrido build), construirlo.
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  echo "[start.sh] dist/ no existe, ejecutando npm run build..."
  npm run build
fi

# Asegurar que el .env existe. Si no, intentar copiar de .env.example.
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "[start.sh] WARNING: .env no existe, copiando de .env.example"
  cp .env.example .env
fi

# Iniciar el servidor Node con la configuracion de produccion.
export NODE_ENV=production
exec node server/src/server.js
