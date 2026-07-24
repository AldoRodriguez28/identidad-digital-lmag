# Diseño — Plan 08: Cursos/Talleres + Bolsa de trabajo

> Sub-proyecto del MVP Identidad Digital Juvenil. Deriva de la spec maestra
> `2026-07-20-mvp-identidad-digital-design.md` §3.1 #9-10, §3.2, §4 (`Workshop`, `JobPosting`).
> Fecha: 2026-07-23. Sigue a Plan 07 (puntos+eventos+check-in, completo).

## 1. Objetivo

Dos catálogos informativos administrables:

- **Cursos y talleres** — el joven ve un catálogo (título, descripción, precio, horario, modalidad);
  el personal municipal lo administra (CRUD).
- **Bolsa de trabajo** — el joven ve un directorio de vacantes (puesto, empresa, requisitos, contacto);
  el personal lo administra (CRUD).

Ambos son **solo lectura para el estudiante** y **CRUD para admin/gestor**.

## 2. Alcance

### Dentro (v1)
- CRUD de talleres y vacantes desde el panel, para roles `admin` y `gestor` (spec §3.2, tabla de roles §2).
- Catálogo público solo-lectura de talleres y vacantes activos, para el estudiante.
- Filtrado del lado del cliente: talleres por modalidad; vacantes por texto (puesto/empresa).
- Activar/desactivar y borrar cada registro desde el panel.

### Fuera (v1) — explícito
- **Sin inscripción interna** a talleres; el joven se inscribe por fuera (spec §3.1 #9).
- **Sin postulación interna** a vacantes; el joven aplica por fuera (spec §3.1 #10).
- **Sin puntos**: estos módulos no otorgan puntos (a diferencia de eventos).
- **Sin cuentas de acceso**: a diferencia de comercios, talleres/vacantes no tienen login propio.
- Sin filtros/paginación en backend, sin relaciones con otras entidades, sin subida de archivos.

## 3. Arquitectura

Dos módulos NestJS **independientes y paralelos**, cada uno calcado del patrón de `EventsModule`
(Plan 07) pero más simple: **sin** `PointsService`, **sin** check-in, **sin** transacciones.

```
api/src/workshops/
  dto/workshop.dto.ts        # CreateWorkshopDto, UpdateWorkshopDto
  workshops.service.ts       # listAdmin, listPublic, create, update(404), remove(404)
  workshops-admin.controller.ts   # /admin/workshops*  @Roles('admin','gestor')
  workshops.controller.ts    # GET /workshops  (público, solo activos)
  workshops.module.ts        # imports: [AuthModule]

api/src/jobs/
  dto/job.dto.ts             # CreateJobDto, UpdateJobDto
  jobs.service.ts            # listAdmin, listPublic, create, update(404), remove(404)
  jobs-admin.controller.ts   # /admin/jobs*  @Roles('admin','gestor')
  jobs.controller.ts         # GET /jobs  (público, solo activos)
  jobs.module.ts             # imports: [AuthModule]
```

Ambos módulos se registran en `api/src/app.module.ts`.

### 3.1 Endpoints

| Método | Ruta | Guard | Notas |
|---|---|---|---|
| GET | `/workshops` | — (público) | Solo `activo:true`, `select` de campos públicos |
| GET | `/admin/workshops` | Session+Roles(admin,gestor) | Incluye inactivos |
| POST | `/admin/workshops` | Session+Roles | 201, devuelve el registro |
| PATCH | `/admin/workshops/:id` | Session+Roles | 404 si no existe |
| DELETE | `/admin/workshops/:id` | Session+Roles | 204 |
| GET | `/jobs` | — (público) | Solo `activo:true` |
| GET | `/admin/jobs` | Session+Roles | Incluye inactivos |
| POST | `/admin/jobs` | Session+Roles | 201 |
| PATCH | `/admin/jobs/:id` | Session+Roles | 404 si no existe |
| DELETE | `/admin/jobs/:id` | Session+Roles | 204 |

Guards: `@UseGuards(SessionGuard, RolesGuard)` + `@Roles('admin','gestor')` en los controllers `*-admin`,
idéntico a `EventsAdminController`. Los `GET /workshops` y `GET /jobs` son públicos de solo lectura,
igual que `GET /events` y `GET /benefits`.

## 4. Modelo de datos (Prisma)

Una sola migración añade el enum y las dos tablas. Sin relaciones.

```prisma
enum Modalidad {
  presencial
  virtual
  hibrido
}

model Workshop {
  id          String    @id @default(cuid())
  titulo      String
  descripcion String
  precio      Int                 // pesos enteros; 0 = gratis
  horario     String              // texto libre, p. ej. "Sábados 9-13h"
  modalidad   Modalidad
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())
}

model JobPosting {
  id          String   @id @default(cuid())
  puesto      String
  empresa     String
  requisitos  String              // texto libre (multilínea)
  contacto    String              // texto libre: email/teléfono/URL
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

Decisiones (confirmadas con el cliente en brainstorming):
- **`modalidad` = enum** `presencial|virtual|hibrido` (consistente con `EventoCategoria`, permite filtro limpio).
- **`precio` = Int** en pesos, `0` = gratis (simple como `puntosOtorgados`; sin centavos).
- **Filtrado en el cliente** (catálogos pequeños; YAGNI en backend).

## 5. Validación (class-validator)

Igual patrón que `event.dto.ts`. `ValidationPipe` global ya activo
(`whitelist:true, forbidNonWhitelisted:true, transform:true`).

**CreateWorkshopDto:** `titulo` `@IsString()@IsNotEmpty()`; `descripcion` `@IsString()@IsNotEmpty()`;
`precio` `@IsInt()@Min(0)`; `horario` `@IsString()@IsNotEmpty()`;
`modalidad` `@IsIn(['presencial','virtual','hibrido'])`; `activo?` `@IsOptional()@IsBoolean()`.
**UpdateWorkshopDto:** todos opcionales.

**CreateJobDto:** `puesto`, `empresa`, `requisitos`, `contacto` todos `@IsString()@IsNotEmpty()`;
`activo?` `@IsOptional()@IsBoolean()`. **UpdateJobDto:** todos opcionales.

## 6. Frontend (Next.js 16 App Router)

Sigue las convenciones de las páginas existentes (`'use client'`, `api()` de `lib/api`, `Link`).

### Estudiante (público)
- `web/src/app/(estudiante)/talleres/page.tsx` — consume `GET /workshops`. Lista tarjetas
  (título, descripción, horario, modalidad; precio como "Gratis" si `precio===0`, si no `$precio`).
  **Filtro cliente** por modalidad (selector: todas/presencial/virtual/híbrido).
- `web/src/app/(estudiante)/vacantes/page.tsx` — consume `GET /jobs`. Lista tarjetas
  (puesto, empresa, requisitos, contacto). **Filtro cliente** por texto (input que matchea puesto/empresa).

### Panel (admin/gestor)
- `web/src/app/(admin)/panel/talleres/page.tsx` — CRUD: formulario de alta
  (título, descripción, precio, horario, selector de modalidad); lista con activar/desactivar y borrar
  (confirmación + feedback de error). Consume `/admin/workshops`.
- `web/src/app/(admin)/panel/vacantes/page.tsx` — CRUD análogo (puesto, empresa, requisitos, contacto).
  Consume `/admin/jobs`.
- `web/src/app/(admin)/panel/layout.tsx` — dos enlaces nuevos en el nav: **Talleres** y **Vacantes**
  (visibles para todos los roles internos, junto a Eventos/Comercios).

## 7. Testing (TDD)

Como Plan 07: escribir el e2e primero (falla), implementar, verificar verde. Suite serializada
(`maxWorkers:1`, ya configurado).

- `api/test/workshops.e2e-spec.ts`:
  - Sin sesión no puede crear → 401.
  - Admin crea, lista, edita y borra (204) un taller.
  - `GET /workshops` público muestra activos y **oculta inactivos**.
- `api/test/jobs.e2e-spec.ts`: los tres casos análogos para vacantes.
- No hay lógica pura nueva (no hay cálculo tipo `progresoNivel`), así que **sin unit tests nuevos**.
- Verificación final: `npm test` + `npm run test:e2e` completos, sin regresiones; `web build` con las
  4 rutas nuevas (`/talleres`, `/vacantes`, `/panel/talleres`, `/panel/vacantes`).

## 8. Seguridad

- `/admin/workshops*` y `/admin/jobs*` exigen `@Roles('admin','gestor')` (gestor sí administra contenido, spec §2).
- `GET /workshops` y `GET /jobs` son públicos pero solo exponen registros `activo:true` y campos no sensibles
  (no hay datos personales en estas entidades).
- Sin escritura pública, sin subida de archivos, sin relaciones con datos sensibles → superficie mínima.

## 9. Estructura de tareas (para el plan)

1. **Workshops backend** — schema+migración (enum+ambas tablas), DTOs, service, controllers, módulo, e2e.
2. **Jobs backend** — DTOs, service, controllers, módulo, e2e (reutiliza la migración de la Tarea 1).
3. **Frontend estudiante** — `/talleres` y `/vacantes` con filtro cliente.
4. **Frontend panel** — `/panel/talleres`, `/panel/vacantes`, enlaces de nav.
5. **Verificación full-suite + docs** — correr todo, actualizar `docs/ESTADO.md` y memoria.

> La migración de la Tarea 1 crea **ambas** tablas y el enum de una vez (evita dos migraciones para un
> cambio atómico de esquema); la Tarea 2 solo añade código que las consume.

## 10. Próximos planes (post-08)
- **09** — PWA instalable (manifest + service worker `@ducanh2912/next-pwa` + meta Safari).
- **10** — Hardening + despliegue. **RELEASE-BLOCKER:** cifrado en reposo del INE + restricción R2,
  CORS allowlist por env, purga de sesiones expiradas.
