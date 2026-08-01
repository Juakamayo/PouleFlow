#!/bin/bash
# Setup PouleFlow en una instancia Ubuntu de AWS
# Uso:  sudo bash setup-aws.sh <URL_DE_REPO_GITHUB>  (ej: https://github.com/Juakamayo/PouleFlow.git)
set -e

REPO_URL="${1:-https://github.com/Juakamayo/PouleFlow.git}"
APP_DIR="/opt/pouleflow"

echo "=== 1/6 Instalando dependencias del sistema ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git

echo "=== 2/6 Instalando Docker ==="
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
echo "Docker version: $(docker --version)"
echo "Compose version: $(docker compose version)"

echo "=== 3/6 Clonando el repositorio ==="
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"
if [ ! -d .git ]; then
  git clone "${REPO_URL}" .
else
  git pull
fi

echo "=== 4/6 Creando archivo .env ==="
if [ ! -f .env ]; then
  cp .env.example .env
  # Generar secretos aleatorios
  DB_PASS=$(openssl rand -hex 16)
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i "s/CHANGE_ME/${DB_PASS}/g" .env
  sed -i "s/CHANGE_ME_super_secret/${JWT_SECRET}/g" .env
  echo "  .env creado con contraseñas generadas (guárdalas: están en ${APP_DIR}/.env)"
else
  echo "  .env ya existe, no se modifica."
fi
# docker compose interpolates .env desde el directorio donde corre, así que lo enlazamos
ln -sf ../.env docker/.env

echo "=== 5/6 Construyendo y levantando contenedores ==="
cd docker
docker compose build --no-cache

# Levantar solo postgres primero para poder restaurar el backup antes de que arranque el backend
docker compose up -d postgres
echo "Esperando a que postgres esté listo..."
for i in $(seq 1 30); do
  if docker exec docker-postgres-1 pg_isready -U pouleflow >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# Restaurar backup si fue provisto como segundo argumento
if [ -n "${2:-}" ] && [ -f "${2}" ]; then
  echo "Restaurando backup de la base de datos: ${2}"
  docker exec -i docker-postgres-1 psql -U pouleflow -d pouleflow < "${2}"
  echo "Backup restaurado."
fi

# Levantar el resto de los servicios
docker compose up -d

echo "=== 6/6 Habilitando auto-inicio al encender la instancia ==="
cat > /etc/systemd/system/pouleflow.service <<'UNIT'
[Unit]
Description=PouleFlow containers
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/pouleflow/docker
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable pouleflow.service
systemctl enable docker.service

echo ""
echo "=== INSTALACIÓN COMPLETADA ==="
echo "Página disponible en: http://$(curl -s ifconfig.me):5000"
echo "Backend API en:       http://$(curl -s ifconfig.me):3000"
echo ""
echo "IMPORTANTE:"
echo "1. Abrí los puertos 5000, 3000 y 22 (SSH) en el Security Group de AWS."
echo "2. Para restaurar tu base de datos local, ejecutá:"
echo "   cat backups/pouleflow_*.sql | docker exec -i docker-postgres-1 psql -U pouleflow -d pouleflow"
echo ""
