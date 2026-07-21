# Estado del proyecto — para continuar

> Última actualización: 2026-07-20. HEAD: `6e74af8`. Rama: `master` (sin remoto).

## Dónde estamos

**Plan 01 (Fundamentos + Auth): COMPLETO y verificado.** 15 commits en `master`.

Entregado:
- Monorepo: `api/` (NestJS + Prisma) + `web/` (Next.js App Router) + Postgres (Docker Compose).
- Auth por **sesión de servidor** (cookie httpOnly, remember-me). Sin JWT.
- Modelos `InternalUser` (rol admin|gestor) y `Session`.
- `PasswordService` = **argon2id vía `hash-wasm`** (WASM; el `argon2` nativo segfaultea en este Mac darwin-x64 sin prebuild).
- Guards `SessionGuard` + `RolesGuard`, decoradores `@Roles()` / `@CurrentUser()`.
- Endpoints `/auth/login`, `/auth/logout`, `/auth/me`. `ValidationPipe` global + `LoginDto` validado.
- Seed idempotente de admin (`npm run db:seed`).
- Frontend: `/login` y `/panel` consumiendo la API con cookie.

Verificación real (no solo build):
- Unit 13/13, e2e 5/5.
- Flujo E2E contra API viva: login 201 (cookie httpOnly/SameSite=Lax/7d) → `/auth/me` OK → password malo 401 → logout invalida sesión → `/auth/me` 401.
- `start:prod` arranca y responde health 200.

## Entorno / cómo arrancar mañana

- **Node 20 obligatorio**: `nvm use 20.19.1` (Node 23 del sistema rompe Prisma). Hay `api/.nvmrc`.
- ORM **Prisma 6.19.3** (NO 7 — su schema difiere).
- Docker daemon debe estar corriendo: `open -a Docker`, luego `docker compose up -d` (Postgres en `:5432`, db `identidad_dev`, user/pass `identidad`).
- Levantar: `cd api && npm run start:dev` (API `:3001`); `cd web && npm run dev` (web `:3000`).
- Admin semilla: `admin@identidad.local` / `Cambiar123!` (tras `npm run db:seed`).
- Nota: existe `web/AGENTS.md` avisando que esta versión de Next.js difiere del conocimiento previo — leer docs de Next en `web/node_modules/next/dist/docs/` antes de tocar APIs específicas de Next.

## Backlog anotado (para el paso de hardening / no bloqueó Plan 01)

- CORS: hoy `origin:true` (dev). Restringir por env en producción.
- Purga de sesiones expiradas (la tabla `Session` crece sin límite).
- `session.service.spec`: falta assert de TTL cuando `remember=false`.
- Login web: sin disable de doble-submit; `web/src/lib/api.ts` manda `Content-Type: application/json` incluso en GET.
- Definir hosting (Railway vs VPS) antes del primer deploy.

## Próximo paso: Plan 02 (aún NO escrito)

**Plan 02 — Auto-registro + Login + Perfil + Credencial del estudiante:**
- Modelo `Student` (ver spec §4) con `credential_token` no adivinable (nanoid) — ya está `nanoid@5` instalado.
- Auto-registro público (cuenta activa de inmediato, nivel Bronce, 0 puntos).
- Login de estudiante + "mantener sesión" + recuperación de contraseña por email (Resend).
- Perfil (datos editables, intereses, redes).
- Credencial digital en `/c/{credential_token}` con el fix de seguridad (no CURP plano).
- INE frente/reverso: subida de archivo simple (SIN OCR en v1) → Cloudflare R2.

Al retomar: invocar `superpowers:writing-plans` para escribir el Plan 02 a partir del spec, luego ejecutarlo con `subagent-driven-development` (mismo flujo que hoy).

## Referencias
- Spec MVP: `docs/superpowers/specs/2026-07-20-mvp-identidad-digital-design.md`
- Plan 01: `docs/superpowers/plans/2026-07-20-01-fundamentos-auth.md`
- Ledger de ejecución (git-ignored, en disco): `.superpowers/sdd/progress.md`
