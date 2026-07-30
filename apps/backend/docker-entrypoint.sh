#!/bin/sh
set -e

echo "Sincronizando esquema de Prisma con la base de datos..."
npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss

echo "Sembrando parámetros fijos (armas y categorías)..."
node prisma/seed.js

echo "Iniciando backend..."
exec "$@"
