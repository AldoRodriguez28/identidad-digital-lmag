# Plan 05 — Panel admin (base): dashboard + estudiantes (con INE) + intereses (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al personal municipal (Administrador y Gestor) un panel con dashboard, gestión de estudiantes (lista, detalle, baja y **vista segura de la INE**) y CRUD del catálogo de intereses.

**Architecture:** Endpoints bajo el prefijo `/admin/*`, todos protegidos por `SessionGuard` + `RolesGuard` con `@Roles('admin','gestor')` (un estudiante/comercio no pasa `SessionGuard`; un principal interno sin el rol correcto recibe 403). Las imágenes de INE se sirven en streaming solo a personal autenticado desde `StorageService`. El frontend gana un layout de panel con navegación, bajo `(admin)/panel/*`, que reutiliza la sesión de servidor.

**Tech Stack:** NestJS, Prisma 6.19.3, class-validator, Next.js 16 App Router. Node 20.

## Global Constraints

- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx. Existe `api/.nvmrc`.
- **ORM Prisma 6.19.3** (NO 7). Postgres en `localhost:5432`, db `identidad_dev` (Docker: `docker compose up -d`).
- **Autorización:** todos los endpoints `/admin/*` usan `@UseGuards(SessionGuard, RolesGuard)` + `@Roles('admin','gestor')`. En este plan admin y gestor tienen el mismo acceso (la gestión de cuentas internas, solo-admin, llega en Plan 06).
- **INE = dato sensible (LGPDPPSO):** su descarga SOLO por personal autenticado (admin/gestor) vía `GET /admin/students/:id/ine/:side`. Nunca pública. `side` ∈ {`frente`,`reverso`}.
- **No fuga:** las respuestas admin de estudiante NUNCA incluyen `passwordHash`. El detalle indica presencia de INE como boolean, no la ruta de storage.
- **Validación** con class-validator (`ValidationPipe` global: `whitelist:true, forbidNonWhitelisted:true, transform:true`).
- **Sesión de servidor**, cookie `idsid`. `SessionGuard` carga el `InternalUser` en `req.user` (con `rol`). Same-site `localhost:3000`↔`:3001` (la cookie viaja en subrequests de imagen).
- **Suite e2e serializada:** `api/test/jest-e2e.json` ya tiene `maxWorkers:1` (no lo cambies).
- **Fuera de este plan (→ Plan 06):** CRUD de usuarios internos (solo admin), CRUD de comercios, "mi perfil" del admin. **Fuera (→ después):** eventos/puntos, talleres/vacantes, PWA.
- **Nota de despliegue (backlog):** con R2 la recuperación de INE será por URL firmada, no `StorageService.getPath` + stream local; el adaptador R2 deberá añadir un método de lectura. Cifrado en reposo del INE sigue pendiente (release-blocker previo).
- **Commits:** uno por tarea mínimo, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Fundación del módulo admin + exportar RolesGuard + Dashboard

**Files:**
- Modify: `api/src/auth/auth.module.ts`
- Create: `api/src/admin/admin.service.ts`
- Create: `api/src/admin/dashboard.controller.ts`
- Create: `api/src/admin/admin.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/admin-dashboard.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `AuthModule` ahora provee y **exporta `RolesGuard`** (además de lo existente).
  - `AdminService.dashboard(): Promise<{ usuarios: { estudiantes: number; internos: number; comercios: number }; topIntereses: { nombre: string; count: number }[] }>` — top 5 intereses por número de estudiantes que los eligieron.
  - `GET /admin/dashboard` (SessionGuard + RolesGuard, `@Roles('admin','gestor')`) → ese objeto.
  - `AdminModule` importa `AuthModule` (para `SessionGuard`/`RolesGuard`).

- [ ] **Step 1: Exportar RolesGuard desde AuthModule**

En `api/src/auth/auth.module.ts` añade `RolesGuard` a `providers` y a `exports` (import desde `./roles.guard`):
```ts
import { RolesGuard } from './roles.guard';
// providers: [AuthService, PasswordService, SessionService, SessionGuard, RolesGuard],
// exports: [PasswordService, SessionService, SessionGuard, RolesGuard],
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/admin-dashboard.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin dashboard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app.close());

  async function adminCookie() {
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    return res.headers['set-cookie'];
  }

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('admin -> 200 con conteos y top intereses', async () => {
    const res = await request(app.getHttpServer()).get('/admin/dashboard').set('Cookie', await adminCookie());
    expect(res.status).toBe(200);
    expect(typeof res.body.usuarios.estudiantes).toBe('number');
    expect(typeof res.body.usuarios.internos).toBe('number');
    expect(typeof res.body.usuarios.comercios).toBe('number');
    expect(Array.isArray(res.body.topIntereses)).toBe(true);
  });
});
```
(Requiere el admin semilla; corre `npm run db:seed` antes si hace falta.)

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run db:seed && npm run test:e2e -- admin-dashboard`
Expected: FAIL (ruta `/admin/dashboard` no existe → 404, o el login del admin da 200 pero dashboard 404).

- [ ] **Step 4: Implementar AdminService**

`api/src/admin/admin.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [estudiantes, internos, comercios, grouped] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.internalUser.count(),
      this.prisma.commerce.count(),
      this.prisma.studentInterest.groupBy({
        by: ['interestId'],
        _count: { interestId: true },
        orderBy: { _count: { interestId: 'desc' } },
        take: 5,
      }),
    ]);
    const interests = await this.prisma.interest.findMany({
      where: { id: { in: grouped.map((g) => g.interestId) } },
      select: { id: true, nombre: true },
    });
    const nameById = new Map(interests.map((i) => [i.id, i.nombre]));
    const topIntereses = grouped.map((g) => ({
      nombre: nameById.get(g.interestId) ?? '—',
      count: g._count.interestId,
    }));
    return { usuarios: { estudiantes, internos, comercios }, topIntereses };
  }
}
```

- [ ] **Step 5: Implementar el controller y el módulo; registrar en AppModule**

`api/src/admin/dashboard.controller.ts`:
```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private admin: AdminService) {}
  @Get()
  dashboard() { return this.admin.dashboard(); }
}
```

`api/src/admin/admin.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
```

En `api/src/app.module.ts`, añade `AdminModule` a `imports`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- admin-dashboard`
Expected: PASS (2/2).

- [ ] **Step 7: Commit**

```bash
git add api/src/admin api/src/auth/auth.module.ts api/src/app.module.ts api/test/admin-dashboard.e2e-spec.ts
git commit -m "feat(api): add admin module, export RolesGuard, dashboard endpoint"
```

---

### Task 2: Shell del panel + página de dashboard (frontend)

**Files:**
- Create: `web/src/app/(admin)/panel/layout.tsx`
- Modify: `web/src/app/(admin)/panel/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET /auth/me`, `POST /auth/logout`, `GET /admin/dashboard`.
- Produces:
  - Layout de panel bajo `(admin)/panel/*`: guard client-side (`GET /auth/me`; si no ok → `/login`); barra de navegación con enlaces **Inicio** (`/panel`), **Estudiantes** (`/panel/estudiantes`), **Intereses** (`/panel/intereses`); muestra nombre+rol y botón de logout. NO envuelve la página de login (que vive en `(admin)/login`, fuera de `panel/`).
  - `/panel` (dashboard): renderiza conteos de usuarios y top intereses.

- [ ] **Step 1: Revisar la guía de Next antes de escribir**

Existe `web/AGENTS.md` (Next 16 difiere del entrenamiento). Confirma en `web/node_modules/next/dist/docs/` cómo funcionan los `layout.tsx` anidados en App Router. Sigue el patrón client-side de guard ya usado (`web/src/app/(estudiante)/perfil/page.tsx`).

- [ ] **Step 2: Crear el layout del panel**

`web/src/app/(admin)/panel/layout.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    api('/auth/me').then(async (r) => {
      if (r.ok) setMe(await r.json());
      else router.push('/login');
    }).catch(() => router.push('/login'));
  }, [router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!me) return <main className="p-6">Cargando…</main>;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/panel" className="font-medium">Inicio</Link>
          <Link href="/panel/estudiantes">Estudiantes</Link>
          <Link href="/panel/intereses">Intereses</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{me.nombre} ({me.rol})</span>
          <button className="rounded bg-gray-200 px-3 py-1" onClick={logout}>Salir</button>
        </div>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Reescribir la página de dashboard**

`web/src/app/(admin)/panel/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Dash = {
  usuarios: { estudiantes: number; internos: number; comercios: number };
  topIntereses: { nombre: string; count: number }[];
};

export default function PanelPage() {
  const [d, setD] = useState<Dash | null>(null);

  useEffect(() => {
    api('/admin/dashboard').then(async (r) => { if (r.ok) setD(await r.json()); }).catch(() => {});
  }, []);

  if (!d) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Inicio</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border p-4"><p className="text-3xl font-bold">{d.usuarios.estudiantes}</p><p className="text-sm text-gray-500">Estudiantes</p></div>
        <div className="rounded-xl border p-4"><p className="text-3xl font-bold">{d.usuarios.internos}</p><p className="text-sm text-gray-500">Usuarios internos</p></div>
        <div className="rounded-xl border p-4"><p className="text-3xl font-bold">{d.usuarios.comercios}</p><p className="text-sm text-gray-500">Comercios</p></div>
      </div>
      <h2 className="mb-2 mt-6 text-lg font-medium">Top intereses</h2>
      <ul className="space-y-1">
        {d.topIntereses.map((t) => (
          <li key={t.nombre} className="flex justify-between rounded border px-3 py-2 text-sm">
            <span>{t.nombre}</span><span className="text-gray-500">{t.count}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Verificar build y ruta**

Run: `cd web && npm run build`; luego con la API arriba (`cd api && npm run start:dev`, `npm run db:seed`) y `npm run dev` en web, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/panel` → 200. Detén los servers.
Expected: build OK, `/panel` 200 (redirige a `/login` en cliente si no hay sesión, pero la ruta responde 200).

- [ ] **Step 5: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add admin panel shell layout and dashboard page"
```

---

### Task 3: API admin de estudiantes (lista paginada + detalle + baja)

**Files:**
- Modify: `api/src/admin/admin.service.ts`
- Create: `api/src/admin/students-admin.controller.ts`
- Create: `api/src/admin/dto/list-query.dto.ts`
- Modify: `api/src/admin/admin.module.ts`
- Create: `api/test/admin-students.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `SessionGuard`, `RolesGuard`.
- Produces:
  - `ListQueryDto { page?: number; pageSize?: number }` (defaults 1 / 20, con `@Type(() => Number)`).
  - `AdminService.listStudents(page, pageSize)` → `{ items: Array<{id, nombreCompleto, correo, nivel, puntosAcumulados, createdAt}>, total, page, pageSize }`.
  - `AdminService.getStudent(id)` → detalle completo SIN `passwordHash`, con `interests: {id,nombre}[]` y `ine: { frente: boolean, reverso: boolean }` (presencia, no la key). `NotFoundException` si no existe.
  - `AdminService.deleteStudent(id)` → borra el estudiante (cascade de intereses/sesiones/benefitUsages/passwordResets). `NotFoundException` si no existe.
  - `GET /admin/students?page=&pageSize=`, `GET /admin/students/:id`, `DELETE /admin/students/:id` (todos SessionGuard+RolesGuard `@Roles('admin','gestor')`; DELETE responde 204).

- [ ] **Step 1: Escribir el DTO de paginación**

`api/src/admin/dto/list-query.dto.ts`:
```ts
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/admin-students.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin students', () => {
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
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Admin Ve', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo: `av${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('lista paginada -> 200 con items/total, sin passwordHash', async () => {
    const res = await request(app.getHttpServer()).get('/admin/students?page=1&pageSize=10').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.items[0]?.passwordHash).toBeUndefined();
  });

  it('detalle -> 200 sin passwordHash, con ine boolean', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.correo).toBeDefined();
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.ine).toEqual({ frente: false, reverso: false });
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/students');
    expect(res.status).toBe(401);
  });

  it('baja -> 204 y luego 404', async () => {
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Borrar', fechaNacimiento: '2004-01-01', curp: `DEL${n}`, sexo: 'M',
      escolaridad: 'Uni', correo: `del${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    const delId = reg.body.id;
    const del = await request(app.getHttpServer()).delete(`/admin/students/${delId}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
    const after = await request(app.getHttpServer()).get(`/admin/students/${delId}`).set('Cookie', cookie);
    expect(after.status).toBe(404);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- admin-students`
Expected: FAIL (rutas no existen).

- [ ] **Step 4: Implementar los métodos en AdminService**

Añade a `api/src/admin/admin.service.ts` (importa `NotFoundException` de `@nestjs/common`):
```ts
async listStudents(page = 1, pageSize = 20) {
  const [items, total] = await Promise.all([
    this.prisma.student.findMany({
      select: { id: true, nombreCompleto: true, correo: true, nivel: true, puntosAcumulados: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    this.prisma.student.count(),
  ]);
  return { items, total, page, pageSize };
}

async getStudent(id: string) {
  const s = await this.prisma.student.findUnique({
    where: { id },
    include: { interests: { include: { interest: { select: { id: true, nombre: true } } } } },
  });
  if (!s) throw new NotFoundException();
  const { passwordHash, ineFrente, ineReverso, interests, ...rest } = s;
  return {
    ...rest,
    interests: interests.map((si) => si.interest),
    ine: { frente: !!ineFrente, reverso: !!ineReverso },
  };
}

async deleteStudent(id: string) {
  const existing = await this.prisma.student.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundException();
  await this.prisma.student.delete({ where: { id } });
}
```

- [ ] **Step 5: Implementar el controller; registrar en el módulo**

`api/src/admin/students-admin.controller.ts`:
```ts
import { Controller, Delete, Get, HttpCode, Param, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { ListQueryDto } from './dto/list-query.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/students')
export class StudentsAdminController {
  constructor(private admin: AdminService) {}

  @Get()
  list(@Query() q: ListQueryDto) {
    return this.admin.listStudents(q.page ?? 1, q.pageSize ?? 20);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.admin.getStudent(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.admin.deleteStudent(id);
  }
}
```

En `api/src/admin/admin.module.ts`, añade `StudentsAdminController` a `controllers`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- admin-students`
Expected: PASS (4/4).

- [ ] **Step 7: Commit**

```bash
git add api/src/admin api/test/admin-students.e2e-spec.ts
git commit -m "feat(api): add admin students list/detail/delete endpoints"
```

---

### Task 4: Recuperación segura de INE `GET /admin/students/:id/ine/:side`

**Files:**
- Modify: `api/src/admin/admin.service.ts`
- Modify: `api/src/admin/students-admin.controller.ts`
- Create: `api/test/admin-ine.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `StorageService`, `SessionGuard`, `RolesGuard`.
- Produces:
  - `AdminService.getInePath(id, side): Promise<{ path: string; contentType: string }>` — `side` ∈ {frente,reverso}; `NotFoundException` si el estudiante o el archivo no existen; `BadRequestException` si `side` inválido.
  - `GET /admin/students/:id/ine/:side` (SessionGuard+RolesGuard `@Roles('admin','gestor')`) → streaming del archivo con su `Content-Type`.

- [ ] **Step 1: Escribir el test e2e fallido**

`api/test/admin-ine.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

describe('Admin INE retrieval', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  const ids: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const alogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    adminCookie = alogin.headers['set-cookie'];
    // estudiante + subir INE con su sesión
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Ine Ve', fechaNacimiento: '2004-01-01', curp: `INE${n}`, sexo: 'F',
      escolaridad: 'Uni', correo: `inev${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
    const slogin = await request(app.getHttpServer()).post('/students/login')
      .send({ correo: `inev${n}@t.com`, password: 'secreto123', remember: false });
    await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', slogin.headers['set-cookie'])
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('admin descarga el frente -> 200 image/png', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}/ine/frente`).set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}/ine/frente`);
    expect(res.status).toBe(401);
  });

  it('side inválido -> 400', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}/ine/costado`).set('Cookie', adminCookie);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- admin-ine`
Expected: FAIL (ruta no existe).

- [ ] **Step 3: Implementar `getInePath` en AdminService**

Añade a `api/src/admin/admin.service.ts` (importa `BadRequestException`; inyecta `StorageService` desde `../storage/storage.service` en el constructor):
```ts
async getInePath(id: string, side: string) {
  if (side !== 'frente' && side !== 'reverso') throw new BadRequestException('side inválido');
  const s = await this.prisma.student.findUnique({
    where: { id }, select: { ineFrente: true, ineReverso: true },
  });
  const key = side === 'frente' ? s?.ineFrente : s?.ineReverso;
  if (!key) throw new NotFoundException();
  const contentType = key.endsWith('.png') ? 'image/png' : key.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
  return { path: this.storage.getPath(key), contentType };
}
```

- [ ] **Step 4: Implementar el endpoint de streaming en el controller**

Añade a `api/src/admin/students-admin.controller.ts` (imports: `Res`, `StreamableFile`, `NotFoundException` de `@nestjs/common`; `createReadStream`, `existsSync` de `fs`; `import type { Response } from 'express'`):
```ts
@Get(':id/ine/:side')
async ine(
  @Param('id') id: string,
  @Param('side') side: string,
  @Res({ passthrough: true }) res: Response,
): Promise<StreamableFile> {
  const { path, contentType } = await this.admin.getInePath(id, side);
  if (!existsSync(path)) throw new NotFoundException();
  res.set({ 'Content-Type': contentType });
  return new StreamableFile(createReadStream(path));
}
```
(Nota: este método debe ir ANTES o DESPUÉS de `detail(:id)` sin ambigüedad de ruta; `:id/ine/:side` es más específico y Nest lo enruta correctamente por segmentos.)

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- admin-ine`
Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```bash
git add api/src/admin api/test/admin-ine.e2e-spec.ts
git commit -m "feat(api): add admin-only secure INE retrieval endpoint"
```

---

### Task 5: Páginas admin de estudiantes (lista + detalle con INE)

**Files:**
- Create: `web/src/app/(admin)/panel/estudiantes/page.tsx`
- Create: `web/src/app/(admin)/panel/estudiantes/[id]/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET /admin/students`, `GET /admin/students/:id`, `GET /admin/students/:id/ine/:side`, `DELETE /admin/students/:id`.
- Produces:
  - `/panel/estudiantes` — lista paginada (nombre, correo, nivel, puntos) con paginación básica; cada fila enlaza al detalle.
  - `/panel/estudiantes/[id]` — detalle completo; muestra las imágenes de INE (frente/reverso) cargándolas con credenciales vía `fetch`→objectURL (solo si `ine.frente`/`ine.reverso`); botón de baja que confirma y regresa a la lista.

- [ ] **Step 1: Crear la página de lista**

`web/src/app/(admin)/panel/estudiantes/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';

type Row = { id: string; nombreCompleto: string; correo: string; nivel: string; puntosAcumulados: number };
type Resp = { items: Row[]; total: number; page: number; pageSize: number };

export default function EstudiantesPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    api(`/admin/students?page=${page}&pageSize=${pageSize}`).then(async (r) => {
      if (r.ok) setData(await r.json());
    }).catch(() => {});
  }, [page]);

  if (!data) return <main className="p-6">Cargando…</main>;
  const pages = Math.max(1, Math.ceil(data.total / pageSize));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Estudiantes ({data.total})</h1>
      <ul className="divide-y rounded-xl border">
        {data.items.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <Link href={`/panel/estudiantes/${s.id}`} className="font-medium hover:underline">{s.nombreCompleto}</Link>
            <span className="text-gray-500">{s.correo} · {s.nivel} · {s.puntosAcumulados} pts</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3 text-sm">
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Crear la página de detalle con INE**

`web/src/app/(admin)/panel/estudiantes/[id]/page.tsx`:
```tsx
'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';

type Detail = {
  nombreCompleto: string; correo: string; curp: string; telefono: string; nivel: string;
  puntosAcumulados: number; colonia: string; escolaridad: string;
  interests: { id: string; nombre: string }[]; ine: { frente: boolean; reverso: boolean };
};

function IneImage({ id, side }: { id: string; side: 'frente' | 'reverso' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    api(`/admin/students/${id}/ine/${side}`).then(async (r) => {
      if (!r.ok) return;
      const blob = await r.blob();
      if (!revoked) setUrl(URL.createObjectURL(blob));
    }).catch(() => {});
    return () => { revoked = true; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, side]);
  if (!url) return <div className="h-40 w-64 animate-pulse rounded bg-gray-100" />;
  return <img src={url} alt={`INE ${side}`} className="h-40 w-64 rounded border object-contain" />;
}

export default function DetalleEstudiantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);

  useEffect(() => {
    api(`/admin/students/${id}`).then(async (r) => {
      if (r.ok) setD(await r.json());
      else if (r.status === 404) router.push('/panel/estudiantes');
    }).catch(() => {});
  }, [id, router]);

  async function baja() {
    if (!confirm('¿Dar de baja a este estudiante? Esta acción no se puede deshacer.')) return;
    const res = await api(`/admin/students/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/panel/estudiantes');
  }

  if (!d) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{d.nombreCompleto}</h1>
        <p className="text-sm text-gray-600">{d.correo} · {d.telefono}</p>
        <p className="mt-1 text-sm">Nivel <b>{d.nivel}</b> · {d.puntosAcumulados} pts · {d.escolaridad} · {d.colonia}</p>
        <p className="text-sm text-gray-500">CURP: {d.curp}</p>
      </div>
      {d.interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.interests.map((i) => <span key={i.id} className="rounded-full border px-3 py-1 text-xs">{i.nombre}</span>)}
        </div>
      )}
      <div>
        <h2 className="mb-2 text-sm font-medium">INE</h2>
        <div className="flex flex-wrap gap-4">
          {d.ine.frente ? <IneImage id={id} side="frente" /> : <p className="text-sm text-gray-400">Sin frente</p>}
          {d.ine.reverso ? <IneImage id={id} side="reverso" /> : <p className="text-sm text-gray-400">Sin reverso</p>}
        </div>
      </div>
      <button className="rounded bg-red-600 px-4 py-2 text-sm text-white" onClick={baja}>Dar de baja</button>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y rutas**

Run: `cd web && npm run build`; con API + web arriba y sesión admin, `curl -s -o /dev/null -w "%{http_code}"` a `http://localhost:3000/panel/estudiantes` → 200. Detén los servers.
Expected: build OK, ruta 200.

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add admin students list and detail pages with INE view"
```

---

### Task 6: API CRUD de intereses (admin)

**Files:**
- Modify: `api/src/admin/admin.service.ts`
- Create: `api/src/admin/interests-admin.controller.ts`
- Create: `api/src/admin/dto/interest.dto.ts`
- Modify: `api/src/admin/admin.module.ts`
- Create: `api/test/admin-interests.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `SessionGuard`, `RolesGuard`.
- Produces:
  - `InterestDto { nombre: string }`.
  - `AdminService.createInterest(nombre)` → `{id, nombre}`; `ConflictException` si el nombre ya existe.
  - `AdminService.updateInterest(id, nombre)` → `{id, nombre}`; `NotFoundException` si no existe; `ConflictException` si el nuevo nombre choca.
  - `AdminService.deleteInterest(id)` → borra (cascade de `StudentInterest`); `NotFoundException` si no existe.
  - `POST /admin/interests`, `PATCH /admin/interests/:id`, `DELETE /admin/interests/:id` (SessionGuard+RolesGuard `@Roles('admin','gestor')`; DELETE 204). El listado usa el `GET /interests` público ya existente.

- [ ] **Step 1: Escribir el DTO**

`api/src/admin/dto/interest.dto.ts`:
```ts
import { IsString, IsNotEmpty } from 'class-validator';
export class InterestDto {
  @IsString() @IsNotEmpty() nombre: string;
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/admin-interests.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin interests CRUD', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const nombre = `Interés ${Date.now()}`;
  let createdId: string;

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
    if (createdId) await prisma.interest.deleteMany({ where: { id: createdId } });
    await app.close();
  });

  it('crear -> 201', async () => {
    const res = await request(app.getHttpServer()).post('/admin/interests').set('Cookie', cookie).send({ nombre });
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe(nombre);
    createdId = res.body.id;
  });

  it('crear duplicado -> 409', async () => {
    const res = await request(app.getHttpServer()).post('/admin/interests').set('Cookie', cookie).send({ nombre });
    expect(res.status).toBe(409);
  });

  it('editar -> 200', async () => {
    const res = await request(app.getHttpServer()).patch(`/admin/interests/${createdId}`).set('Cookie', cookie)
      .send({ nombre: `${nombre} editado` });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe(`${nombre} editado`);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/admin/interests').send({ nombre: 'x' });
    expect(res.status).toBe(401);
  });

  it('borrar -> 204', async () => {
    const res = await request(app.getHttpServer()).delete(`/admin/interests/${createdId}`).set('Cookie', cookie);
    expect(res.status).toBe(204);
    createdId = '';
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- admin-interests`
Expected: FAIL (rutas no existen).

- [ ] **Step 4: Implementar los métodos en AdminService**

Añade a `api/src/admin/admin.service.ts` (importa `ConflictException`):
```ts
async createInterest(nombre: string) {
  const dup = await this.prisma.interest.findUnique({ where: { nombre }, select: { id: true } });
  if (dup) throw new ConflictException('El interés ya existe');
  return this.prisma.interest.create({ data: { nombre }, select: { id: true, nombre: true } });
}

async updateInterest(id: string, nombre: string) {
  const existing = await this.prisma.interest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundException();
  const dup = await this.prisma.interest.findUnique({ where: { nombre }, select: { id: true } });
  if (dup && dup.id !== id) throw new ConflictException('El interés ya existe');
  return this.prisma.interest.update({ where: { id }, data: { nombre }, select: { id: true, nombre: true } });
}

async deleteInterest(id: string) {
  const existing = await this.prisma.interest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundException();
  await this.prisma.interest.delete({ where: { id } });
}
```

- [ ] **Step 5: Implementar el controller; registrar en el módulo**

`api/src/admin/interests-admin.controller.ts`:
```ts
import { Body, Controller, Delete, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { InterestDto } from './dto/interest.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/interests')
export class InterestsAdminController {
  constructor(private admin: AdminService) {}

  @Post()
  create(@Body() dto: InterestDto) { return this.admin.createInterest(dto.nombre); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: InterestDto) { return this.admin.updateInterest(id, dto.nombre); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.admin.deleteInterest(id); }
}
```

En `api/src/admin/admin.module.ts`, añade `InterestsAdminController` a `controllers`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- admin-interests`
Expected: PASS (5/5).

- [ ] **Step 7: Correr toda la suite (sin regresiones)**

Run: `cd api && npm test && npm run test:e2e`
Expected: unit y e2e verdes (incluye admin-dashboard, admin-students, admin-ine, admin-interests además de lo anterior).

- [ ] **Step 8: Commit**

```bash
git add api/src/admin api/test/admin-interests.e2e-spec.ts
git commit -m "feat(api): add admin interests CRUD endpoints"
```

---

### Task 7: Página admin de intereses (CRUD)

**Files:**
- Create: `web/src/app/(admin)/panel/intereses/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET /interests`, `POST /admin/interests`, `PATCH /admin/interests/:id`, `DELETE /admin/interests/:id`.
- Produces: `/panel/intereses` — lista los intereses; permite crear (input + botón), editar en línea, y borrar (con confirmación). Refresca la lista tras cada operación.

- [ ] **Step 1: Crear la página**

`web/src/app/(admin)/panel/intereses/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Interest = { id: string; nombre: string };

export default function InteresesPage() {
  const [items, setItems] = useState<Interest[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/interests');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/interests', { method: 'POST', body: JSON.stringify({ nombre: nuevo }) });
    if (res.ok) { setNuevo(''); await load(); }
    else if (res.status === 409) setError('Ese interés ya existe.');
    else setError('No se pudo crear.');
  }

  async function editar(id: string, actual: string) {
    const nombre = prompt('Nuevo nombre', actual);
    if (!nombre || nombre === actual) return;
    const res = await api(`/admin/interests/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
    if (res.ok) await load();
  }

  async function borrar(id: string) {
    if (!confirm('¿Borrar este interés?')) return;
    const res = await api(`/admin/interests/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Intereses</h1>
      <form onSubmit={crear} className="mb-4 flex gap-2">
        <input className="flex-1 rounded border p-2" placeholder="Nuevo interés" value={nuevo}
          onChange={(e) => setNuevo(e.target.value)} required />
        <button className="rounded bg-black px-4 text-white" type="submit">Agregar</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{i.nombre}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => editar(i.id, i.nombre)}>Editar</button>
              <button className="text-red-600" onClick={() => borrar(i.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Verificar build y ruta**

Run: `cd web && npm run build`; con API + web arriba y sesión admin, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/panel/intereses` → 200. Detén los servers.
Expected: build OK, ruta 200.

- [ ] **Step 3: Verificación E2E manual del panel**

Con API (`npm run start:dev`, `npm run db:seed`) y web arriba: entra en `/login` con `admin@identidad.local` / `Cambiar123!`, verifica el dashboard (conteos + top intereses), navega a Estudiantes (lista + detalle; si el estudiante subió INE, se ven las imágenes), y en Intereses crea/edita/borra uno.
Expected: el panel funciona de extremo a extremo con el rol admin.

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add admin interests CRUD page"
```

---

## Self-Review

**Spec coverage (Plan 05 vs spec §5):**
- Dashboard (conteo de usuarios por tipo, top intereses): Tasks 1, 2. ✅
- Usuarios estudiantes (CRUD/vista, detalle con INE): Tasks 3, 4, 5. ✅ (edición de datos del estudiante por admin = backlog; aquí lista/detalle/baja + INE).
- Catálogo de intereses (CRUD, "paginado"): Tasks 6, 7. ✅ (el listado de intereses es pequeño; paginación no crítica — backlog si crece).
- Usuarios internos (CRUD) y "Mi perfil": **Plan 06** (declarado).
- Autorización admin/gestor con `RolesGuard`; INE restringido a personal autenticado (cierra el acceso público del INE — el cifrado en reposo sigue backlog).

**Placeholder scan:** sin TBD/TODO; todo el código completo e inline.

**Type consistency:** `AdminService.dashboard/listStudents/getStudent/deleteStudent/getInePath/createInterest/updateInterest/deleteInterest` consumidos por sus controllers con firmas coincidentes. `@Roles('admin','gestor')` + `@UseGuards(SessionGuard, RolesGuard)` uniforme en todos los controllers admin. `RolesGuard` exportado por `AuthModule` (Task 1) y disponible vía `AdminModule` que importa `AuthModule`. Frontend: el layout `(admin)/panel/layout.tsx` envuelve solo `panel/*` (no la página de login). Las imágenes de INE se cargan con credenciales vía `fetch`→objectURL.

## Próximos planes
- **06** — Panel admin (cuentas): usuarios internos CRUD (solo admin), comercios CRUD, "mi perfil".
- **07** — Eventos + puntos + QR check-in. **08** — talleres/vacantes (catálogos estudiante + admin). **09** — PWA.
