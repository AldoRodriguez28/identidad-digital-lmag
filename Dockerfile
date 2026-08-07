# Build de la API (NestJS) desde el monorepo npm workspaces. Contexto de build = raíz del repo,
# porque npm workspaces necesita ver package.json de api/ y web/ para resolver el lockfile compartido.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --workspace=api

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY package.json package-lock.json ./
COPY api ./api
WORKDIR /app/api
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/node_modules ./api/node_modules
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/prisma ./api/prisma
COPY api/package.json ./api/package.json
WORKDIR /app/api
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
