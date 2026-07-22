# Estado del proyecto — para continuar

> Última actualización: 2026-07-21. HEAD: `26f8452`. Rama: `master` (sin remoto).

## Roadmap (≈10 planes; 01–05 hechos)
01 Fundamentos✅ · 02 Estudiante✅ · 03 Credencial/INE/reset✅ · 04 Comercios✅ · 05 Panel admin base✅ · **06 Panel admin cuentas (siguiente)** · 07 Puntos+Eventos+check-in · 08 Cursos/talleres+Bolsa de trabajo · 09 PWA · 10 Hardening+despliegue.

## Dónde estamos

**Planes 01–05 COMPLETOS y verificados.** Suites: unit 21/21, e2e 58/58 (suite serializada con `maxWorkers:1`).

### Plan 05 (nuevo) — Panel admin base:
- `/admin/*` con `SessionGuard`+`RolesGuard('admin','gestor')`; dashboard (conteos+top intereses); shell del panel con nav por rol bajo `(admin)/panel/*`.
- Estudiantes: lista paginada + detalle (`select` explícito, sin passwordHash/keys INE) + baja; **vista segura de INE** `GET /admin/students/:id/ine/:side` (solo admin/gestor, no-store) — cierra el acceso público al INE.
- CRUD de intereses + página. Verificado E2E con rol admin.

### Plan 04 (nuevo) — Comercios/beneficios:
- 4º principal `commerce` (sesión polimórfica `internal_user|student|commerce`), separación estricta probada; modelos `Commerce`/`BenefitUsage`; comercio semilla `comercio@demo.local` / `Comercio123!`.
- `POST /commerce/validate` (escaneo QR → nombre+nivel del joven + % descuento del comercio autenticado + registra `BenefitUsage`); `GET /benefits` (directorio público).
- Frontend: QR en credencial (`qrcode.react`), `/beneficios`, login comercio + `/comercio/validar` (cámara `html5-qrcode` + manual).
- Backlog: dedupe/rate-limit de `BenefitUsage`. El uso de beneficio NO da puntos (v1).

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

## Próximo paso: Plan 06 (escrito)

**Plan 06 — Panel admin (cuentas): usuarios internos CRUD (solo admin) + comercios CRUD + mi perfil.**
- Usuarios internos (admin/gestor): CRUD **solo para rol `admin`** (`@Roles('admin')`) — aquí el gestor recibe 403 (primer caso real de denegación por rol). Sin auto-borrado.
- Comercios: CRUD (admin/gestor) — alta de cuentas de comercio (cierra el "seed dev" del Plan 04).
- Mi perfil: editar nombre/email + cambiar contraseña propia.
- Frontend: páginas `/panel/usuarios` (link solo admin), `/panel/comercios`, `/panel/perfil`; actualizar nav del layout.

Plan: `docs/superpowers/plans/2026-07-21-06-panel-admin-cuentas.md`. Ejecutar con `subagent-driven-development`.

> Pendientes tras el panel: Plan 07 puntos+eventos+check-in; Plan 08 cursos/talleres + bolsa de trabajo (spec §3.1, aún sin construir); Plan 09 PWA; Plan 10 hardening+deploy.

## Referencias
- Spec MVP: `docs/superpowers/specs/2026-07-20-mvp-identidad-digital-design.md`
- Planes: `docs/superpowers/plans/` (01 fundamentos-auth, 02 estudiante, 03 credencial-ine-reset)
- Ledger de ejecución (git-ignored, en disco): `.superpowers/sdd/progress.md`
