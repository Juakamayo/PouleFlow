#!/bin/sh
set -e

echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Sembrando parámetros fijos (armas y categorías)..."
node prisma/seed.js

echo "Iniciando backend..."
exec "$@"
