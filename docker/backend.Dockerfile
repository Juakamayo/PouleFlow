FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared-types ./packages/shared-types
COPY prisma ./prisma
WORKDIR /app/apps/backend
RUN npm install
COPY apps/backend ./
RUN npx prisma generate --schema=../../prisma/schema.prisma
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
