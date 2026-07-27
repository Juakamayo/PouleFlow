FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared-types ./packages/shared-types
WORKDIR /app/apps/frontend
RUN npm install
COPY apps/frontend ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
