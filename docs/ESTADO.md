# Estado del proyecto — para continuar

> Última actualización: 2026-07-25. HEAD: `79d8e37`. Rama: `master` (sin remoto).

## Roadmap (≈10 planes; 01–09 hechos)
01 Fundamentos✅ · 02 Estudiante✅ · 03 Credencial/INE/reset✅ · 04 Comercios✅ · 05 Panel admin base✅ · 06 Panel admin cuentas✅ · 07 Puntos+Eventos+check-in✅ · 08 Cursos/talleres+Bolsa de trabajo✅ · 09 PWA✅ · **10 Hardening+despliegue (siguiente)**.

## 🎨 Sesión 2026-07-24/25 — Rediseño visual + features (commiteado en `d240716` api, `79d8e37` web)

Se clonó el diseño del sitio de referencia (San Andrés Tuxtla) y se agregaron features pedidas por el cliente. **Tests: unit 24/24, e2e 88/88 verdes.** Detalle en la memoria `identidad-ui-pendiente-restyle` y `identidad-design-system-referente`.

**Diseño:** sistema guinda `#58101f` / dorado `#b9852e` / Montserrat + Caveat (tokens en `web/src/app/globals.css`, Tailwind v4). Todo el sitio restilado: home landing, login/registro/recuperar (`AuthLayout`), credencial `/c` (solo QR), panel admin (shell sidebar + kit `panel/_components/ui.tsx`), lado estudiante (`components/StudentShell.tsx`), comercio (`components/CommerceShell.tsx`). Assets en `web/public/brand/`. Material de referencia en `web/reference/` (git-ignored).

**Features nuevas:**
- Intereses con **categoría** (educacion/deporte/cultura/... ); dashboard muestra categoría.
- Estudiante: **nombre/apellidoPaterno/apellidoMaterno** (registro los pide, se guardan + `nombreCompleto` combinado); **redes** en registro; perfil ampliado (edad, redes, progreso de nivel) con **tarjeta flip 3D** (QR al reverso, `components/TarjetaFlip.tsx`).
- Módulos **Educación / Deporte / Cultura**: modelo `Recurso{tipo,titulo,categoria,descripcion,contacto?}`, `GET /recursos?tipo=` + `/admin/recursos`, páginas estudiante + `/panel/recursos`.
- **Login unificado** `POST /auth/ingresar` (detecta interno/comercio/estudiante y redirige); todos entran por `/ingresar` (`/login` y `/comercio/ingresar` redirigen).
- **Correo único en todo el padrón** (`assertEmailAvailable`) al dar de alta (estudiante/comercio/interno).
- **Comercio:** `validate` solo consulta; `POST /commerce/purchase` registra compra con **monto (decimal)** + descuento; `GET /commerce/usages` con filtro de fechas; panel comercio con **Escanear** + **Compras** (historial + totales).
- Confirmación de contraseña en alta de comercio.
- Fix: `mountedRef` reseteado en escáneres (StrictMode dev descartaba respuestas → "no hacía nada").

## 🔎 PENDIENTE (revisión 2026-07-25, por prioridad)
1. **RELEASE-BLOCKER:** cifrar INE en reposo + restringir R2 (LGPDPPSO, brief §7).
2. **Plan 10 hardening/deploy:** CORS allowlist por env (hoy `origin:true`), purga de sesiones, adaptadores R2/Resend, HTTPS (lo exige la PWA), definir hosting (Railway vs VPS).
3. **📱 Menú móvil:** los sidebars son `hidden md:flex` → en celular NO hay navegación (es PWA para jóvenes → importante). Falta hamburguesa.
4. **Recursos sin e2e** (educación/deporte/cultura no cubierto por tests).
5. **INE en el registro** (el original la pide al registrarse; nosotros aparte).
6. **Correo único solo al crear**, falta en ediciones (helper ya soporta `exclude`).
7. Confirmación de contraseña también en usuarios internos y registro estudiante.
8. Placeholders: "Mis Logros" / "Próximo evento" (perfil), campana de notificaciones, WhatsApp de ayuda sin número.
9. **Verificación PWA en navegador** (instalable + offline) nunca hecha.
10. Menores: "Hibrido" sin acento, e2e 404 en varios CRUD, TTL caché `/c/` en SW.

## Dónde estamos

**Planes 01–09 COMPLETOS + rediseño/features 2026-07-24/25.** Suites backend: unit 24/24, e2e 88/88 (`maxWorkers:1`).

### Plan 09 (nuevo) — PWA instalable:
- Ejecutado con `subagent-driven-development` (3 tareas review-clean + 1 fix Important + revisión de rama READY TO MERGE).
- Enfoque **nativo de Next 16 sin librería PWA** (`@ducanh2912/next-pwa`/serwist son plugins de webpack incompatibles con Turbopack): `app/manifest.ts` + Metadata/viewport API + service worker a mano.
- Piezas: `manifest.ts` (standalone, íconos 192/512/maskable), `scripts/generate-icons.mjs` (sharp, placeholders "ID") + `public/icons/*.png`, `layout.tsx` (metadata + `viewport` themeColor + `lang="es"` + monta `<ServiceWorkerRegister/>`), `offline/page.tsx`, `public/sw.js` (`/c/*` network-first+caché con fallback `/offline`; `/_next/static/*` cache-first; navegaciones→`/offline`; **nunca** cachea `/students/me|/admin|/auth`), `sw-register.tsx`.
- **PENDIENTE (verificación manual en Chrome):** DevTools→Application: manifest sin errores + "installable", SW `sw.js` activo; abrir un `/c/<token>` online y confirmar que en Cache Storage `idj-v1` están **ambos** (documento `/c/<token>` **y** JSON de la API), luego Network→Offline y recargar → credencial+QR desde caché; ruta autenticada offline → `/offline`; Lighthouse PWA installable. En producción el SW exige **HTTPS**.
- **Backlog Plan 10 (de la revisión):** caché `/c/` sin TTL/cap acumula credenciales de terceros en dispositivos compartidos (privacidad); documentar bump coordinado de `CACHE`/`idj-v1` (skipWaiting+claim con `/_next/static` cache-first puede dar chunk-skew).

### Plan 08 (nuevo) — Cursos/talleres + Bolsa de trabajo:
- Ejecutado con `subagent-driven-development` (4 tareas de código review-clean + revisión de rama READY TO MERGE).
- **API:** `enum Modalidad` + modelos `Workshop`/`JobPosting` (migración única `workshops_jobs`). Módulos `workshops` y `jobs`, cada uno con CRUD admin (`/admin/workshops*`, `/admin/jobs*`, `@Roles('admin','gestor')`) y catálogo público solo-activos (`GET /workshops`, `GET /jobs`) con `select` que no filtra `activo`/`createdAt`. `precio` Int (0=Gratis); `modalidad` enum `presencial|virtual|hibrido`. Sin puntos, sin inscripción/postulación interna, sin cuentas de acceso.
- **Web:** estudiante `/talleres` (filtro cliente por modalidad, "Gratis" si precio 0) y `/vacantes` (filtro cliente por texto puesto/empresa); panel `/panel/talleres` y `/panel/vacantes` (CRUD) + enlaces de nav.
- **Backlog menor** (hacer junto con eventos): badge modalidad "Hibrido" sin acento (CSS capitalize); input búsqueda sin `type="text"`; e2e 404 PATCH/DELETE inexistente; spread `{...dto}` en update; empty-state en listas de panel.

### Plan 06 (nuevo) — Panel admin (cuentas):
- Usuarios internos CRUD **solo admin** (`@Roles('admin')`, gestor→403, sin auto-borrado 400): `api/src/admin/internal-users.*` + `/panel/usuarios` (enlace de nav solo admin).
- Comercios CRUD (`@Roles('admin','gestor')`): `api/src/admin/commerces-admin.*` + `/panel/comercios` (sustituye el "seed dev" del Plan 04; comercio creado puede hacer `POST /commerce/login`).
- Mi perfil: `GET/PATCH /admin/me` + `POST /admin/me/password` (`api/src/admin/profile.*`) + `/panel/perfil`. `UpdateProfileDto` solo nombre/email (no permite auto-escalar rol).
- Revisión final opus: READY TO MERGE, sin correcciones requeridas. Todos los Minor → backlog. Gap fuera de alcance: protección "último admin".

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

## Plan 07 — COMPLETO (2026-07-23)

**Plan 07 — Puntos/niveles + Eventos + QR check-in.** Ejecutado con `executing-plans`.
- **API:** enums/modelos `Event`/`EventCheckin`/`PointsMovement` (migración `20260723022831_events_points`); `PointsService.award(tx,...)` transaccional (inserta movimiento + recalcula nivel con `nivelForPuntos`, nunca a mano) y `getSummary`; helper puro `progresoNivel`. `EventsService` CRUD (`/admin/events*`, roles admin/gestor) + catálogo público solo-activos (`GET /events`). Check-in atómico (`POST /admin/events/:id/checkin`): único por `@@unique([eventId,studentId])` (2º → 409), token/evento inválido → 404, 401 sin sesión staff. Endpoint del joven `GET /students/me/points`.
- **Web:** `/mis-puntos` (nivel, barra de progreso, eventos asistidos, historial), `/eventos` (catálogo público), `/panel/eventos` (CRUD + activar/desactivar) con enlace en nav, `/panel/eventos/checkin` (escáner `html5-qrcode`, reutiliza patrón anti-doble-escaneo del módulo comercio + entrada manual).
- **Verificación real:** unit 24/24, e2e 81/81 (`maxWorkers:1`), sin regresiones; `web build` OK con las 4 rutas nuevas. Falta verificación E2E manual con cámara (Task 6 Step 3) contra API+web vivas.

## Próximo paso: Plan 10 (por escribir) — último del roadmap
**Plan 10 — Hardening + despliegue.** **RELEASE-BLOCKER:** cifrado en reposo del INE + restricción R2 (spec §7, LGPDPPSO). Además, backlog acumulado pre-deploy: CORS allowlist por env (hoy `origin:true`), purga de sesiones expiradas, adaptadores R2/Resend, HTTPS (requerido por el SW de la PWA), y los backlogs menores de planes previos (incl. caché `/c/` sin TTL de Plan 09, "Hibrido" sin acento de Plan 08). Definir hosting (Railway vs VPS). Escribir con `writing-plans`.
> **RELEASE-BLOCKER vigente:** cifrado en reposo del INE + restricción R2 antes de producción con INE real (spec §7, LGPDPPSO).

## Referencias
- Spec MVP: `docs/superpowers/specs/2026-07-20-mvp-identidad-digital-design.md`
- Planes: `docs/superpowers/plans/` (01 fundamentos-auth, 02 estudiante, 03 credencial-ine-reset)
- Ledger de ejecución (git-ignored, en disco): `.superpowers/sdd/progress.md`
