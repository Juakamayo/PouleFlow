FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Copiamos primero solo los package.json del workspace (mejor cache de capas de Docker).
# Esto le permite a npm resolver @pouleflow/shared-types como paquete local, no del registro público.
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm install --workspaces --include-workspace-root

# Ahora sí, el código fuente real
COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types
COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=@pouleflow/backend

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/prisma ./prisma
RUN chmod +x ./apps/backend/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./apps/backend/docker-entrypoint.sh"]
CMD ["node", "apps/backend/dist/main.js"]
