# PouleFlow

Plataforma de gestión de torneos de esgrima — alternativa moderna a FencingTime / Engarde Escrime, pensada para autoalojarse en un contenedor Docker.

## Stack

- **Backend**: Node.js + TypeScript + NestJS (API REST + WebSocket gateway)
- **Frontend**: React + TypeScript (Vite) + TailwindCSS
- **Base de datos**: PostgreSQL + Prisma ORM
- **Estado en tiempo real**: Redis (pub/sub para WebSockets, estado efímero de pistas)
- **Infraestructura**: Docker Compose

## Estructura del repo

```
apps/
  backend/          NestJS API + WebSocket gateway
  frontend/          React (panel admin, mesa de control, pantallas de estadio)
packages/
  shared-types/       Interfaces TypeScript compartidas entre backend y frontend
docker/               Dockerfiles y docker-compose
prisma/               schema.prisma y migraciones
```

## Rutas del frontend

Todo es una sola web app con rutas y permisos distintos:

- `/admin` — CRUD de tiradores, clubes, países, árbitros; creación de torneos/eventos; generación de poules y tableaux.
- `/mesa/:pistaId` — carga rápida de resultados de poule y eliminación directa (pensado para tablet).
- `/display/:pistaId` — pantalla de solo lectura para proyector/TV de estadio, sin login, actualizada vía WebSocket.

## Desarrollo local

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d
```

## Estado del proyecto

🚧 En construcción — desarrollado de forma iterativa ("vibe coding") junto a Claude.
