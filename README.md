# Plataforma Identidad Digital Juvenil

Monorepo de la plataforma de identidad digital juvenil municipal.

- `api/` — Backend NestJS + Prisma + PostgreSQL
- `web/` — Frontend Next.js (App Router) + TypeScript + Tailwind

Ver `CLAUDE.md` (brief del producto) y `docs/superpowers/` (specs y planes).

## Desarrollo local

```bash
npm run db:up      # levanta Postgres (Docker)
# API
cd api && npm install && npx prisma migrate dev && npm run db:seed && npm run start:dev
# Web
cd web && npm install && npm run dev
```
