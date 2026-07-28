FROM node:20-alpine AS builder
WORKDIR /app

# Mismo principio que el backend: instalar desde la raíz del workspace para que
# @pouleflow/shared-types se resuelva como paquete local, no del registro público.
COPY package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm install --workspaces --include-workspace-root

COPY apps/frontend ./apps/frontend
COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=@pouleflow/frontend

FROM nginx:1.27-alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
