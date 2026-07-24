# Plan 08 — Cursos/Talleres + Bolsa de trabajo (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el personal municipal (admin/gestor) administre por CRUD dos catálogos informativos —cursos/talleres y vacantes de bolsa de trabajo— y que el joven los vea (solo lectura) con filtrado del lado del cliente.

**Architecture:** Dos módulos NestJS independientes y paralelos (`workshops`, `jobs`), cada uno calcado del patrón de `EventsModule` del Plan 07 pero **más simple**: sin `PointsService`, sin check-in, sin transacciones. Cada módulo expone un controller admin (`/admin/workshops*`, `/admin/jobs*`, con `SessionGuard`+`RolesGuard('admin','gestor')`) y un controller público de solo lectura (`GET /workshops`, `GET /jobs`, solo registros activos), igual que `GET /events`/`GET /benefits`. En el frontend: páginas de estudiante `/talleres` y `/vacantes` (filtro en cliente) y páginas de panel `/panel/talleres` y `/panel/vacantes` (CRUD), con dos enlaces nuevos en el nav del panel.

**Tech Stack:** NestJS, Prisma 6.19.3 (NO 7), class-validator, Next.js 16 App Router, Node 20.

## Global Constraints

- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx. Existe `api/.nvmrc`.
- **Docker corriendo:** `open -a Docker` → `docker compose up -d` (Postgres en `localhost:5432`, db `identidad_dev`).
- **ORM Prisma 6.19.3** (NO 7). Migraciones con `npx prisma migrate dev --name <nombre>` y regenerar cliente.
- **Autorización:** `@UseGuards(SessionGuard, RolesGuard)` + `@Roles('admin','gestor')` en `/admin/workshops*` y `/admin/jobs*`. `GET /workshops` y `GET /jobs` son **públicos de solo lectura** (solo registros `activo:true`), igual que `GET /benefits` (Plan 04) y `GET /events` (Plan 07).
- **Validación** con class-validator (`ValidationPipe` global ya activo: `whitelist:true, forbidNonWhitelisted:true, transform:true`). `precio` `@IsInt() @Min(0)`. `modalidad` `@IsIn(['presencial','virtual','hibrido'])`.
- **Decisiones de diseño (confirmadas con el cliente):** `modalidad` = enum `presencial|virtual|hibrido` (el valor es sin acento; "híbrido" es solo display en el frontend). `precio` = `Int` en pesos, `0` = "Gratis". Filtrado **en el cliente** (catálogos pequeños; sin query params en backend).
- **Sin puntos, sin inscripción/postulación interna, sin cuentas de acceso** para estos módulos (v1). El joven se inscribe/aplica por fuera.
- **Sesión de servidor** polimórfica, cookie `idsid`. `SessionGuard` carga el `InternalUser` en `req.user` (con `id`, `rol`).
- **Suite e2e serializada:** `api/test/jest-e2e.json` ya tiene `maxWorkers:1` (no lo cambies).
- **Commits:** uno por tarea mínimo, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Admin semilla para tests e2e:** `admin@identidad.local` / `Cambiar123!` (login vía `POST /auth/login`).

## File Structure

- `api/prisma/schema.prisma` — añade `enum Modalidad`; modelos `Workshop`, `JobPosting`. **Una sola migración** crea el enum y ambas tablas (Tarea 1).
- `api/src/workshops/` — `dto/workshop.dto.ts`, `workshops.service.ts`, `workshops-admin.controller.ts`, `workshops.controller.ts`, `workshops.module.ts`.
- `api/src/jobs/` — `dto/job.dto.ts`, `jobs.service.ts`, `jobs-admin.controller.ts`, `jobs.controller.ts`, `jobs.module.ts`.
- `api/src/app.module.ts` — registra `WorkshopsModule` y `JobsModule`.
- `api/test/workshops.e2e-spec.ts`, `api/test/jobs.e2e-spec.ts` — e2e.
- `web/src/app/(estudiante)/talleres/page.tsx`, `web/src/app/(estudiante)/vacantes/page.tsx` — vistas del joven.
- `web/src/app/(admin)/panel/talleres/page.tsx`, `web/src/app/(admin)/panel/vacantes/page.tsx` — panel CRUD.
- `web/src/app/(admin)/panel/layout.tsx` — enlaces **Talleres** y **Vacantes** en el nav.

---

### Task 1: Workshops backend (schema + migración + CRUD + catálogo público)

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/src/workshops/dto/workshop.dto.ts`
- Create: `api/src/workshops/workshops.service.ts`
- Create: `api/src/workshops/workshops-admin.controller.ts`
- Create: `api/src/workshops/workshops.controller.ts`
- Create: `api/src/workshops/workshops.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/workshops.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `SessionGuard`, `RolesGuard`, `@Roles` (`../auth/roles.decorator`).
- Produces:
  - Prisma: `enum Modalidad { presencial, virtual, hibrido }`; `Workshop { id, titulo, descripcion, precio(Int), horario, modalidad(Modalidad), activo(Boolean=true), createdAt }`; `JobPosting` (se añade en el mismo schema aquí para migrar una vez, pero su código va en Task 2).
  - `CreateWorkshopDto { titulo, descripcion, precio(int≥0), horario, modalidad('presencial'|'virtual'|'hibrido'), activo? }`; `UpdateWorkshopDto` (todos opcionales).
  - `WorkshopsService.listAdmin()` (incluye inactivos), `.listPublic()` (solo activos), `.create(dto)`, `.update(id,dto)` (404), `.remove(id)` (404).
  - `GET /workshops` (público, activos), `GET/POST /admin/workshops`, `PATCH/DELETE /admin/workshops/:id` (admin/gestor; DELETE 204).

- [x] **Step 1: Añadir enum y modelos al schema**

En `api/prisma/schema.prisma`, tras el enum `TipoMovimiento` (o junto a los otros enums), añade:
```prisma
enum Modalidad {
  presencial
  virtual
  hibrido
}
```

Al final del archivo añade **ambos** modelos (JobPosting se usa hasta Task 2, pero se crea aquí para migrar una sola vez):
```prisma
model Workshop {
  id          String    @id @default(cuid())
  titulo      String
  descripcion String
  precio      Int
  horario     String
  modalidad   Modalidad
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())
}

model JobPosting {
  id          String   @id @default(cuid())
  puesto      String
  empresa     String
  requisitos  String
  contacto    String
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

- [x] **Step 2: Migrar y regenerar el cliente**

Run: `cd api && nvm use 20.19.1 && npx prisma migrate dev --name workshops_jobs && npx prisma generate`
Expected: migración aplicada (crea `Modalidad`, `Workshop`, `JobPosting`), cliente regenerado sin error.

- [x] **Step 3: Escribir los DTOs de Workshop**

`api/src/workshops/dto/workshop.dto.ts`:
```ts
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateWorkshopDto {
  @IsString() @IsNotEmpty() titulo: string;
  @IsString() @IsNotEmpty() descripcion: string;
  @IsInt() @Min(0) precio: number;
  @IsString() @IsNotEmpty() horario: string;
  @IsIn(['presencial', 'virtual', 'hibrido']) modalidad: 'presencial' | 'virtual' | 'hibrido';
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateWorkshopDto {
  @IsOptional() @IsString() @IsNotEmpty() titulo?: string;
  @IsOptional() @IsString() @IsNotEmpty() descripcion?: string;
  @IsOptional() @IsInt() @Min(0) precio?: number;
  @IsOptional() @IsString() @IsNotEmpty() horario?: string;
  @IsOptional() @IsIn(['presencial', 'virtual', 'hibrido']) modalidad?: 'presencial' | 'virtual' | 'hibrido';
  @IsOptional() @IsBoolean() activo?: boolean;
}
```

- [x] **Step 4: Escribir el test e2e de Workshops (falla)**

`api/test/workshops.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Workshops CRUD + public catalog', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const ids: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.workshop.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('sin sesión no puede crear talleres -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/admin/workshops')
      .send({ titulo: 'X', descripcion: 'd', precio: 0, horario: 'L-V', modalidad: 'virtual' });
    expect(res.status).toBe(401);
  });

  it('admin crea, lista, edita y borra un taller', async () => {
    const create = await request(app.getHttpServer()).post('/admin/workshops').set('Cookie', cookie)
      .send({ titulo: 'Soldadura', descripcion: 'ICATVER', precio: 1200, horario: 'Sáb 9-13h', modalidad: 'presencial' });
    expect(create.status).toBe(201);
    expect(create.body.precio).toBe(1200);
    const id = create.body.id;
    ids.push(id);

    const list = await request(app.getHttpServer()).get('/admin/workshops').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.find((w: any) => w.id === id)).toBeDefined();

    const upd = await request(app.getHttpServer()).patch(`/admin/workshops/${id}`).set('Cookie', cookie)
      .send({ precio: 0, activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.precio).toBe(0);
    expect(upd.body.activo).toBe(false);

    const del = await request(app.getHttpServer()).delete(`/admin/workshops/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
  });

  it('GET /workshops es público y solo muestra activos', async () => {
    const activo = await request(app.getHttpServer()).post('/admin/workshops').set('Cookie', cookie)
      .send({ titulo: 'Cocina', descripcion: 'd', precio: 500, horario: 'Dom', modalidad: 'hibrido' });
    ids.push(activo.body.id);
    const inactivo = await request(app.getHttpServer()).post('/admin/workshops').set('Cookie', cookie)
      .send({ titulo: 'Oculto', descripcion: 'd', precio: 500, horario: 'Dom', modalidad: 'virtual', activo: false });
    ids.push(inactivo.body.id);

    const pub = await request(app.getHttpServer()).get('/workshops'); // sin cookie
    expect(pub.status).toBe(200);
    const idsPub = pub.body.map((w: any) => w.id);
    expect(idsPub).toContain(activo.body.id);
    expect(idsPub).not.toContain(inactivo.body.id);
  });
});
```

- [x] **Step 5: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- workshops`
Expected: FAIL (rutas no existen).

- [x] **Step 6: Implementar `WorkshopsService`**

`api/src/workshops/workshops.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/workshop.dto';

const PUBLIC = { id: true, titulo: true, descripcion: true, precio: true, horario: true, modalidad: true } as const;

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.workshop.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listPublic() {
    return this.prisma.workshop.findMany({ where: { activo: true }, select: PUBLIC, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateWorkshopDto) {
    return this.prisma.workshop.create({
      data: {
        titulo: dto.titulo, descripcion: dto.descripcion, precio: dto.precio,
        horario: dto.horario, modalidad: dto.modalidad, activo: dto.activo ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateWorkshopDto) {
    const existing = await this.prisma.workshop.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.workshop.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const existing = await this.prisma.workshop.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.workshop.delete({ where: { id } });
  }
}
```

- [x] **Step 7: Implementar los controllers y el módulo**

`api/src/workshops/workshops-admin.controller.ts`:
```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/workshop.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/workshops')
export class WorkshopsAdminController {
  constructor(private workshops: WorkshopsService) {}

  @Get()
  list() { return this.workshops.listAdmin(); }

  @Post()
  create(@Body() dto: CreateWorkshopDto) { return this.workshops.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkshopDto) { return this.workshops.update(id, dto); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.workshops.remove(id); }
}
```

`api/src/workshops/workshops.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';

@Controller('workshops')
export class WorkshopsController {
  constructor(private workshops: WorkshopsService) {}

  @Get()
  list() { return this.workshops.listPublic(); }
}
```

`api/src/workshops/workshops.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkshopsService } from './workshops.service';
import { WorkshopsAdminController } from './workshops-admin.controller';
import { WorkshopsController } from './workshops.controller';

@Module({
  imports: [AuthModule],
  controllers: [WorkshopsAdminController, WorkshopsController],
  providers: [WorkshopsService],
})
export class WorkshopsModule {}
```

En `api/src/app.module.ts`: importa `WorkshopsModule` y añádelo al array `imports` de `@Module`.
```ts
import { WorkshopsModule } from './workshops/workshops.module';
// ...en imports, junto a EventsModule:
// ..., EventsModule, WorkshopsModule], controllers: [HealthController] })
```

- [x] **Step 8: Verificar que pasa**

Run: `cd api && npm run test:e2e -- workshops`
Expected: PASS (3/3).

- [x] **Step 9: Commit**

```bash
git add api/prisma api/src/workshops api/src/app.module.ts api/test/workshops.e2e-spec.ts
git commit -m "feat(api): add workshops schema, admin CRUD and public catalog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Jobs backend (CRUD + catálogo público)

**Files:**
- Create: `api/src/jobs/dto/job.dto.ts`
- Create: `api/src/jobs/jobs.service.ts`
- Create: `api/src/jobs/jobs-admin.controller.ts`
- Create: `api/src/jobs/jobs.controller.ts`
- Create: `api/src/jobs/jobs.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/jobs.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `SessionGuard`, `RolesGuard`, `@Roles`. La tabla `JobPosting` y su cliente Prisma ya existen (migrados en Task 1).
- Produces:
  - `CreateJobDto { puesto, empresa, requisitos, contacto, activo? }`; `UpdateJobDto` (todos opcionales).
  - `JobsService.listAdmin()`, `.listPublic()` (solo activos), `.create(dto)`, `.update(id,dto)` (404), `.remove(id)` (404).
  - `GET /jobs` (público, activos), `GET/POST /admin/jobs`, `PATCH/DELETE /admin/jobs/:id` (admin/gestor; DELETE 204).

- [x] **Step 1: Escribir los DTOs de Job**

`api/src/jobs/dto/job.dto.ts`:
```ts
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString() @IsNotEmpty() puesto: string;
  @IsString() @IsNotEmpty() empresa: string;
  @IsString() @IsNotEmpty() requisitos: string;
  @IsString() @IsNotEmpty() contacto: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateJobDto {
  @IsOptional() @IsString() @IsNotEmpty() puesto?: string;
  @IsOptional() @IsString() @IsNotEmpty() empresa?: string;
  @IsOptional() @IsString() @IsNotEmpty() requisitos?: string;
  @IsOptional() @IsString() @IsNotEmpty() contacto?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
```

- [x] **Step 2: Escribir el test e2e de Jobs (falla)**

`api/test/jobs.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Job postings CRUD + public catalog', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const ids: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.jobPosting.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('sin sesión no puede crear vacantes -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/admin/jobs')
      .send({ puesto: 'X', empresa: 'e', requisitos: 'r', contacto: 'c' });
    expect(res.status).toBe(401);
  });

  it('admin crea, lista, edita y borra una vacante', async () => {
    const create = await request(app.getHttpServer()).post('/admin/jobs').set('Cookie', cookie)
      .send({ puesto: 'Cajero', empresa: 'Tienda', requisitos: 'Prepa', contacto: 'rh@tienda.com' });
    expect(create.status).toBe(201);
    expect(create.body.puesto).toBe('Cajero');
    const id = create.body.id;
    ids.push(id);

    const list = await request(app.getHttpServer()).get('/admin/jobs').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.find((j: any) => j.id === id)).toBeDefined();

    const upd = await request(app.getHttpServer()).patch(`/admin/jobs/${id}`).set('Cookie', cookie)
      .send({ empresa: 'Tienda MX', activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.empresa).toBe('Tienda MX');
    expect(upd.body.activo).toBe(false);

    const del = await request(app.getHttpServer()).delete(`/admin/jobs/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
  });

  it('GET /jobs es público y solo muestra activos', async () => {
    const activo = await request(app.getHttpServer()).post('/admin/jobs').set('Cookie', cookie)
      .send({ puesto: 'Mesero', empresa: 'Café', requisitos: 'Ninguno', contacto: 'cafe@x.com' });
    ids.push(activo.body.id);
    const inactivo = await request(app.getHttpServer()).post('/admin/jobs').set('Cookie', cookie)
      .send({ puesto: 'Oculto', empresa: 'Café', requisitos: 'Ninguno', contacto: 'cafe@x.com', activo: false });
    ids.push(inactivo.body.id);

    const pub = await request(app.getHttpServer()).get('/jobs'); // sin cookie
    expect(pub.status).toBe(200);
    const idsPub = pub.body.map((j: any) => j.id);
    expect(idsPub).toContain(activo.body.id);
    expect(idsPub).not.toContain(inactivo.body.id);
  });
});
```

- [x] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- jobs`
Expected: FAIL (rutas no existen).

- [x] **Step 4: Implementar `JobsService`**

`api/src/jobs/jobs.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

const PUBLIC = { id: true, puesto: true, empresa: true, requisitos: true, contacto: true } as const;

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.jobPosting.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listPublic() {
    return this.prisma.jobPosting.findMany({ where: { activo: true }, select: PUBLIC, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateJobDto) {
    return this.prisma.jobPosting.create({
      data: {
        puesto: dto.puesto, empresa: dto.empresa, requisitos: dto.requisitos,
        contacto: dto.contacto, activo: dto.activo ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateJobDto) {
    const existing = await this.prisma.jobPosting.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.jobPosting.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const existing = await this.prisma.jobPosting.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.jobPosting.delete({ where: { id } });
  }
}
```

- [x] **Step 5: Implementar los controllers y el módulo**

`api/src/jobs/jobs-admin.controller.ts`:
```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/jobs')
export class JobsAdminController {
  constructor(private jobs: JobsService) {}

  @Get()
  list() { return this.jobs.listAdmin(); }

  @Post()
  create(@Body() dto: CreateJobDto) { return this.jobs.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) { return this.jobs.update(id, dto); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.jobs.remove(id); }
}
```

`api/src/jobs/jobs.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}

  @Get()
  list() { return this.jobs.listPublic(); }
}
```

`api/src/jobs/jobs.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JobsService } from './jobs.service';
import { JobsAdminController } from './jobs-admin.controller';
import { JobsController } from './jobs.controller';

@Module({
  imports: [AuthModule],
  controllers: [JobsAdminController, JobsController],
  providers: [JobsService],
})
export class JobsModule {}
```

En `api/src/app.module.ts`: importa `JobsModule` y añádelo al array `imports`.
```ts
import { JobsModule } from './jobs/jobs.module';
// ...en imports, junto a WorkshopsModule:
// ..., WorkshopsModule, JobsModule], controllers: [HealthController] })
```

- [x] **Step 6: Verificar que pasa**

Run: `cd api && npm run test:e2e -- jobs`
Expected: PASS (3/3).

- [x] **Step 7: Correr toda la suite backend (sin regresiones)**

Run: `cd api && nvm use 20.19.1 && npm test && npm run test:e2e`
Expected: unit y e2e verdes (incluye workshops y jobs además de lo anterior).

- [x] **Step 8: Commit**

```bash
git add api/src/jobs api/src/app.module.ts api/test/jobs.e2e-spec.ts
git commit -m "feat(api): add job postings admin CRUD and public catalog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Frontend estudiante — `/talleres` y `/vacantes`

**Files:**
- Create: `web/src/app/(estudiante)/talleres/page.tsx`
- Create: `web/src/app/(estudiante)/vacantes/page.tsx`

**Interfaces:**
- Consumes: `api()` (`../../../lib/api`), `GET /workshops`, `GET /jobs`.
- Produces:
  - `/talleres` — catálogo público; filtro **cliente** por modalidad (todas/presencial/virtual/híbrido); muestra "Gratis" si `precio===0`. No requiere sesión.
  - `/vacantes` — directorio público; filtro **cliente** por texto (matchea puesto/empresa). No requiere sesión.

- [x] **Step 1: Crear `/talleres`**

`web/src/app/(estudiante)/talleres/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Workshop = { id: string; titulo: string; descripcion: string; precio: number; horario: string; modalidad: string };
const MODALIDADES = [
  { value: '', label: 'Todas' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hibrido', label: 'Híbrido' },
];

export default function TalleresPage() {
  const [items, setItems] = useState<Workshop[]>([]);
  const [modalidad, setModalidad] = useState('');

  useEffect(() => {
    api('/workshops').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {});
  }, []);

  const visibles = modalidad ? items.filter((w) => w.modalidad === modalidad) : items;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cursos y talleres</h1>
        <select className="rounded border p-2 text-sm" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
          {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500">No hay talleres disponibles por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((w) => (
            <li key={w.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{w.titulo}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">{w.modalidad}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{w.descripcion}</p>
              <p className="mt-2 text-xs text-gray-500">{w.horario}</p>
              <p className="mt-1 text-sm font-semibold text-green-600">
                {w.precio === 0 ? 'Gratis' : `$${w.precio}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [x] **Step 2: Crear `/vacantes`**

`web/src/app/(estudiante)/vacantes/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Job = { id: string; puesto: string; empresa: string; requisitos: string; contacto: string };

export default function VacantesPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api('/jobs').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {});
  }, []);

  const term = q.trim().toLowerCase();
  const visibles = term
    ? items.filter((j) => j.puesto.toLowerCase().includes(term) || j.empresa.toLowerCase().includes(term))
    : items;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Bolsa de trabajo</h1>
      <input className="mb-4 w-full rounded border p-2 text-sm" placeholder="Buscar por puesto o empresa"
        value={q} onChange={(e) => setQ(e.target.value)} />
      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500">No hay vacantes disponibles por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((j) => (
            <li key={j.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{j.puesto}</h2>
                <span className="text-sm text-gray-600">{j.empresa}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{j.requisitos}</p>
              <p className="mt-2 text-sm">Contacto: <span className="font-medium">{j.contacto}</span></p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [x] **Step 3: Verificar build y rutas**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK; `/talleres` y `/vacantes` aparecen en la lista de rutas.

- [x] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add student workshops and job postings catalog pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Frontend admin — `/panel/talleres`, `/panel/vacantes` + nav

**Files:**
- Modify: `web/src/app/(admin)/panel/layout.tsx`
- Create: `web/src/app/(admin)/panel/talleres/page.tsx`
- Create: `web/src/app/(admin)/panel/vacantes/page.tsx`

**Interfaces:**
- Consumes: `api()` (`../../../../lib/api`), `GET/POST /admin/workshops`, `PATCH/DELETE /admin/workshops/:id`, `GET/POST /admin/jobs`, `PATCH/DELETE /admin/jobs/:id`.
- Produces:
  - Nav del panel gana enlaces **Talleres** (`/panel/talleres`) y **Vacantes** (`/panel/vacantes`) para todos los roles internos.
  - `/panel/talleres` — lista + alta (título, descripción, precio, horario, modalidad) + activar/desactivar + borrar.
  - `/panel/vacantes` — lista + alta (puesto, empresa, requisitos, contacto) + activar/desactivar + borrar.

- [x] **Step 1: Añadir los enlaces al nav del layout**

En `web/src/app/(admin)/panel/layout.tsx`, dentro del `<nav>`, tras el enlace de Eventos, añade:
```tsx
<Link href="/panel/talleres">Talleres</Link>
<Link href="/panel/vacantes">Vacantes</Link>
```

- [x] **Step 2: Crear `/panel/talleres`**

`web/src/app/(admin)/panel/talleres/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Workshop = { id: string; titulo: string; precio: number; horario: string; modalidad: string; activo: boolean };
const MODS = ['presencial', 'virtual', 'hibrido'];

export default function PanelTalleresPage() {
  const [items, setItems] = useState<Workshop[]>([]);
  const [f, setF] = useState({ titulo: '', descripcion: '', precio: '', horario: '', modalidad: 'presencial' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/workshops');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/workshops', {
      method: 'POST',
      body: JSON.stringify({ ...f, precio: Number(f.precio) }),
    });
    if (res.ok) { setF({ titulo: '', descripcion: '', precio: '', horario: '', modalidad: 'presencial' }); await load(); }
    else setError('Revisa los datos (precio entero ≥ 0).');
  }

  async function toggleActivo(w: Workshop) {
    const res = await api(`/admin/workshops/${w.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !w.activo }) });
    if (res.ok) await load(); else setError('No se pudo actualizar.');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este taller?')) return;
    const res = await api(`/admin/workshops/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Cursos y talleres</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Título" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
        <select className="rounded border p-2" value={f.modalidad} onChange={(e) => setF({ ...f, modalidad: e.target.value })}>
          {MODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="col-span-2 rounded border p-2" placeholder="Descripción" required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        <input className="rounded border p-2" placeholder="Horario (ej. Sáb 9-13h)" required value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} />
        <input className="rounded border p-2" type="number" min={0} placeholder="Precio (0 = gratis)" required value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear taller</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((w) => (
          <li key={w.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{w.titulo} · <span className="capitalize">{w.modalidad}</span> · <b>{w.precio === 0 ? 'Gratis' : `$${w.precio}`}</b> {w.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => toggleActivo(w)}>{w.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(w.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [x] **Step 3: Crear `/panel/vacantes`**

`web/src/app/(admin)/panel/vacantes/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Job = { id: string; puesto: string; empresa: string; requisitos: string; contacto: string; activo: boolean };

export default function PanelVacantesPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [f, setF] = useState({ puesto: '', empresa: '', requisitos: '', contacto: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/jobs');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/jobs', { method: 'POST', body: JSON.stringify(f) });
    if (res.ok) { setF({ puesto: '', empresa: '', requisitos: '', contacto: '' }); await load(); }
    else setError('Revisa los datos (todos los campos son obligatorios).');
  }

  async function toggleActivo(j: Job) {
    const res = await api(`/admin/jobs/${j.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !j.activo }) });
    if (res.ok) await load(); else setError('No se pudo actualizar.');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar esta vacante?')) return;
    const res = await api(`/admin/jobs/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Bolsa de trabajo</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Puesto" required value={f.puesto} onChange={(e) => setF({ ...f, puesto: e.target.value })} />
        <input className="rounded border p-2" placeholder="Empresa" required value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
        <textarea className="col-span-2 rounded border p-2" placeholder="Requisitos" required value={f.requisitos} onChange={(e) => setF({ ...f, requisitos: e.target.value })} />
        <input className="col-span-2 rounded border p-2" placeholder="Contacto (email / teléfono / URL)" required value={f.contacto} onChange={(e) => setF({ ...f, contacto: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear vacante</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((j) => (
          <li key={j.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{j.puesto} · <span className="text-gray-600">{j.empresa}</span> {j.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => toggleActivo(j)}>{j.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(j.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [x] **Step 4: Verificar build y rutas**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK; `/panel/talleres` y `/panel/vacantes` en la lista de rutas.

- [x] **Step 5: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add workshops and job postings admin CRUD pages and nav links

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Verificación full-suite + cierre de docs

**Files:**
- Modify: `docs/superpowers/plans/2026-07-23-08-talleres-bolsa-trabajo.md` (marcar checkboxes)
- Modify: `docs/ESTADO.md`
- Modify: memoria del proyecto (`identidad-digital-estado.md` + `MEMORY.md`)

**Interfaces:**
- Consumes: todo lo anterior. Produces: estado documentado y verificado.

- [x] **Step 1: Correr toda la suite backend + build web**

Run: `cd api && nvm use 20.19.1 && npm test && npm run test:e2e`
Expected: unit y e2e verdes, sin regresiones.
Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK con las 4 rutas nuevas (`/talleres`, `/vacantes`, `/panel/talleres`, `/panel/vacantes`).

- [x] **Step 2: Verificación E2E manual (opcional pero recomendada)**

Con API (`npm run start:dev`, admin semilla) y web arriba, sesión admin: en **Talleres** crea un taller (precio 0 → debe mostrar "Gratis") y otro de pago; desactiva uno. En **/talleres** (sin sesión) verifica que solo aparece el activo y que el filtro por modalidad funciona. Repite el flujo análogo en **Vacantes**/**/vacantes** (filtro por texto).
Expected: el catálogo público solo muestra activos; los filtros de cliente funcionan.

- [x] **Step 3: Marcar el plan como completo y actualizar estado**

- Marca todos los `- [ ]` de este plan como `- [x]`.
- En `docs/ESTADO.md`: mover Plan 08 a completo (roadmap `01–08 hechos`), actualizar HEAD, y poner Plan 09 (PWA) como siguiente.
- Actualiza la memoria del proyecto (`identidad-digital-estado.md`) y su índice `MEMORY.md`: Planes 01–08 completos; próximo Plan 09 (PWA).

- [x] **Step 4: Commit**

```bash
git add docs
git commit -m "docs: mark Plan 08 complete, set Plan 09 as next

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Plan 08 vs design §2-8):**
- Cursos/talleres solo-lectura para estudiante + CRUD admin (spec §3.1 #9, §3.2): Task 1 (backend) + Task 3 (`/talleres`) + Task 4 (`/panel/talleres`). ✅
- Bolsa de trabajo directorio + CRUD admin (spec §3.1 #10, §3.2): Task 2 (backend) + Task 3 (`/vacantes`) + Task 4 (`/panel/vacantes`). ✅
- Modelo de datos `Workshop`/`JobPosting` + `enum Modalidad`, una sola migración: Task 1. ✅
- `modalidad` enum, `precio` Int (0=Gratis), filtrado en cliente: DTOs (Task 1/2), display y filtros (Task 3/4). ✅
- Roles admin/gestor en `/admin/*`; `GET /workshops`+`GET /jobs` públicos solo-activos: Tasks 1, 2. ✅
- Fuera de alcance (sin puntos, sin inscripción/postulación interna, sin cuentas de acceso): ningún task los añade. ✅

**Placeholder scan:** sin TBD/TODO; todo el código completo e inline.

**Type consistency:** `modalidad` usa el valor `'presencial'|'virtual'|'hibrido'` (sin acento) de forma uniforme entre el enum Prisma, el `@IsIn` de los DTOs, el `<select>` del panel (`MODS`) y el filtro de estudiante (`MODALIDADES`); "Híbrido" con acento aparece solo como etiqueta de display. `precio` es `Int` en el schema, DTO (`@IsInt`), formulario (`Number(f.precio)`) y display (`precio === 0 ? 'Gratis' : '$'+precio`). Los campos públicos devueltos por `listPublic` (`workshop`: id/titulo/descripcion/precio/horario/modalidad; `jobPosting`: id/puesto/empresa/requisitos/contacto) coinciden con los tipos consumidos en las páginas de estudiante. Los controllers admin devuelven el registro completo (incluye `activo`), consumido por las páginas de panel. `DELETE` responde 204 y las páginas tratan `res.ok` como éxito.

**Seguridad:** `/admin/workshops*` y `/admin/jobs*` con `@Roles('admin','gestor')`; catálogos públicos solo exponen `activo:true` y campos no sensibles (estas entidades no contienen datos personales); sin escritura pública ni archivos → superficie mínima.

## Próximos planes
- **09** — PWA instalable (manifest.json + service worker `@ducanh2912/next-pwa` + meta tags Safari).
- **10** — Hardening + despliegue. **RELEASE-BLOCKER vigente:** cifrado en reposo del INE + restricción R2, CORS allowlist por env, purga de sesiones expiradas.
