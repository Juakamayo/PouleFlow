#!/bin/bash
# Backup de la base de datos local (Linux/Windows git-bash)
set -e

PG_CONTAINER="docker-postgres-1"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pouleflow_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "Exportando base de datos desde el contenedor ${PG_CONTAINER}..."
docker exec "${PG_CONTAINER}" pg_dump -U pouleflow -d pouleflow > "${BACKUP_FILE}"

echo "Backup guardado en: ${BACKUP_FILE}"
echo "Tamaño: $(du -h "${BACKUP_FILE}" | cut -f1)"
