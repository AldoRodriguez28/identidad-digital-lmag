# Estado del proyecto — para continuar

> Última actualización: 2026-07-21. HEAD: `14448fa`. Rama: `master` (sin remoto).

## Dónde estamos

**Planes 01 (Fundamentos+Auth), 02 (Estudiante) y 03 (Credencial/INE/reset): COMPLETOS y verificados.** 43 commits en `master`. Suites: unit 21/21, e2e 33/33 (suite serializada con `maxWorkers:1`).

### Plan 03 (nuevo) — entregado:
- `StorageService` (adaptador local, R2-ready) + subida de INE `POST /students/me/ine` (multipart, valida magic bytes + ≤5MB, `StudentGuard`) — solo almacena, sin descarga pública.
- Credencial pública `GET /c/:token` (token opaco, expone SOLO nombre/nivel/edad/escolaridad/colonia/intereses/redes) + página `/c/[token]`.
- `EmailService` (dev/consola, Resend-ready) + reset de contraseña sin enumeración, tokens single-use + expiración 1h + cierre atómico; páginas `/recuperar` y `/recuperar/[token]`.
- **RELEASE-BLOCKER (no de merge):** antes de producción con INE real, activar cifrado en reposo + restricción R2 (spec §7, LGPDPPSO).

### Plan 02 (nuevo) — entregado:
- **Sesión de servidor polimórfica** (`internal_user | student`): admin y estudiante comparten cookie `idsid`, separados por `principalType` (probado: cookie de un principal no accede al endpoint del otro → 401).
- Modelos `Student`, `Interest`, `StudentInterest`; `GET /interests`; helper `nivelForPuntos` (aún sin usar — para el sistema de puntos).
- **Auto-registro público** `POST /students/register` (activo de inmediato, Bronce/0 pts, `credentialToken` no adivinable vía `crypto.randomBytes`, 409 correo/CURP dup, 400 interés inexistente).
- Auth estudiante (`StudentGuard`, `@CurrentStudent`, login/logout/me) y perfil (`GET`/`PATCH /students/me/profile`, intereses, escritura transaccional).
- Frontend: `/registro`, `/ingresar`, `/perfil` — flujo completo verificado E2E contra el stack vivo.
- NOTA: el `credentialToken` NO usa nanoid (su resolución CJS/ESM era ambigua aquí); usa `crypto.randomBytes(16).toString('base64url')`.

### Plan 01 — entregado:

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

## Backlog anotado (para el paso de hardening / no bloqueó Plan 01-02)

- **CORS: hoy `origin:true` (dev). Restringir por allowlist de env antes del deploy.** (obligatorio pre-producción)
- Purga de sesiones expiradas (la tabla `Session` crece sin límite).
- `session.service.spec`: falta assert de TTL cuando `remember=true`.
- Frontend: sin disable de doble-submit en `/registro`; tipado `any` en handlers `@CurrentStudent`.
- Cobertura e2e `/interests`: asertar orden y campos exactos.
- Definir hosting (Railway vs VPS) antes del primer deploy.

## Próximo paso: Plan 04 (escrito)

**Plan 04 — Comercios / beneficios:**
- 4º rol `commerce` (sesión polimórfica extendida a `internal_user|student|commerce`).
- Modelos `Commerce` y `BenefitUsage`; auth de comercio (`CommerceGuard`, login/me).
- `POST /commerce/validate` {credentialToken}: el comercio escanea el QR de la credencial del joven → valida, registra `BenefitUsage`, devuelve nivel + % descuento.
- `GET /benefits` (directorio público de comercios afiliados).
- Frontend: QR en la credencial, directorio `/beneficios`, login e interfaz de escaneo del comercio.
- Alta de comercios: seed dev por ahora (CRUD admin llega en Plan 05).

Plan: `docs/superpowers/plans/2026-07-21-04-comercios-beneficios.md`. Ejecutar con `subagent-driven-development`.

## Referencias
- Spec MVP: `docs/superpowers/specs/2026-07-20-mvp-identidad-digital-design.md`
- Planes: `docs/superpowers/plans/` (01 fundamentos-auth, 02 estudiante, 03 credencial-ine-reset)
- Ledger de ejecución (git-ignored, en disco): `.superpowers/sdd/progress.md`
