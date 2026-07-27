#!/bin/sh
set -e

echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Iniciando backend..."
exec "$@"
