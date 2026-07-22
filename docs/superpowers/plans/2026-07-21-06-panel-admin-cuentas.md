# Plan 06 — Panel admin (cuentas): usuarios internos + comercios + mi perfil (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el panel: que un Administrador gestione las cuentas internas (admin/gestor), que admin y gestor den de alta y editen comercios afiliados, y que cualquier usuario interno edite su propio perfil y cambie su contraseña.

**Architecture:** Tres subdominios nuevos en el módulo admin, cada uno con su servicio dedicado (`InternalUsersService`, `CommercesAdminService`, `ProfileService`) para no engordar `AdminService`. Los endpoints de **usuarios internos** exigen `@Roles('admin')` (un gestor recibe 403); los de **comercios** y **mi perfil** permiten `@Roles('admin','gestor')`. El frontend gana páginas `/panel/usuarios` (visible solo para admin), `/panel/comercios` y `/panel/perfil`.

**Tech Stack:** NestJS, Prisma 6.19.3, argon2id (PasswordService), class-validator, Next.js 16 App Router. Node 20.

## Global Constraints

- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx. Existe `api/.nvmrc`.
- **ORM Prisma 6.19.3** (NO 7). Postgres en `localhost:5432`, db `identidad_dev` (Docker: `docker compose up -d`).
- **Passwords argon2id** vía `PasswordService` (`hash`, `verify`). NO importar `argon2` (removido). Nunca exponer `passwordHash`.
- **Autorización:** `@UseGuards(SessionGuard, RolesGuard)` en todos los endpoints. **Usuarios internos → `@Roles('admin')`** (gestor recibe 403). **Comercios y mi perfil → `@Roles('admin','gestor')`**.
- **Protección de cuenta:** un usuario NO puede borrarse a sí mismo (`id === req.user.id` → `BadRequestException`). (Proteger "último admin" = backlog.)
- **Validación** con class-validator (`ValidationPipe` global: `whitelist:true, forbidNonWhitelisted:true, transform:true`). El `rol` se valida con `@IsIn(['admin','gestor'])`.
- **Sesión de servidor**, cookie `idsid`. `SessionGuard` carga el `InternalUser` completo en `req.user` (con `rol`, `email`, `nombre`, `id`).
- **Suite e2e serializada:** `api/test/jest-e2e.json` ya tiene `maxWorkers:1` (no lo cambies).
- **Fuera de este plan:** proteger "último admin" (backlog); reset de contraseña de otros usuarios por admin (backlog); eventos/puntos (Plan 07). El alta de comercios de este plan sustituye el "seed dev" del Plan 04 (el seed sigue existiendo para dev).
- **Commits:** uno por tarea mínimo, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: API CRUD de usuarios internos (solo admin)

**Files:**
- Create: `api/src/admin/internal-users.service.ts`
- Create: `api/src/admin/internal-users.controller.ts`
- Create: `api/src/admin/dto/internal-user.dto.ts`
- Modify: `api/src/admin/admin.module.ts`
- Create: `api/test/admin-internal-users.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `PasswordService`, `SessionGuard`, `RolesGuard`, `@CurrentUser`.
- Produces:
  - `CreateInternalUserDto { email, nombre, rol('admin'|'gestor'), password(min 8) }`.
  - `UpdateInternalUserDto { nombre?, rol?('admin'|'gestor'), activo? }`.
  - `InternalUserView = { id, email, nombre, rol, activo, createdAt }` (NUNCA passwordHash).
  - `InternalUsersService.list()`, `.create(dto)` (409 si email dup), `.update(id, dto)` (404 si no existe), `.remove(id, currentUserId)` (404 si no existe; `BadRequestException` si `id===currentUserId`).
  - `GET/POST /admin/internal-users`, `PATCH/DELETE /admin/internal-users/:id` — todos `@UseGuards(SessionGuard, RolesGuard)` + **`@Roles('admin')`**; DELETE 204.

- [ ] **Step 1: Escribir los DTOs**

`api/src/admin/dto/internal-user.dto.ts`:
```ts
import { IsEmail, IsIn, IsOptional, IsString, IsNotEmpty, IsBoolean, MinLength } from 'class-validator';

export class CreateInternalUserDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() nombre: string;
  @IsIn(['admin', 'gestor']) rol: 'admin' | 'gestor';
  @IsString() @MinLength(8) password: string;
}

export class UpdateInternalUserDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsIn(['admin', 'gestor']) rol?: 'admin' | 'gestor';
  @IsOptional() @IsBoolean() activo?: boolean;
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/admin-internal-users.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Admin internal users', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let gestorCookie: string;
  const cleanup: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);
    const alogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    adminCookie = alogin.headers['set-cookie'];
    // gestor de prueba
    const gEmail = `gestor${Date.now()}@t.com`;
    const g = await prisma.internalUser.create({
      data: { email: gEmail, passwordHash: await pass.hash('gestor1234'), nombre: 'Gestor', rol: 'gestor' },
    });
    cleanup.push(g.id);
    const glogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: gEmail, password: 'gestor1234', remember: false });
    gestorCookie = glogin.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: { in: cleanup } } });
    await prisma.internalUser.deleteMany({ where: { id: { in: cleanup } } });
    await app.close();
  });

  it('gestor NO puede listar usuarios internos -> 403', async () => {
    const res = await request(app.getHttpServer()).get('/admin/internal-users').set('Cookie', gestorCookie);
    expect(res.status).toBe(403);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/internal-users');
    expect(res.status).toBe(401);
  });

  it('admin crea, lista, edita y borra un usuario interno', async () => {
    const email = `nuevo${Date.now()}@t.com`;
    const create = await request(app.getHttpServer()).post('/admin/internal-users').set('Cookie', adminCookie)
      .send({ email, nombre: 'Nuevo', rol: 'gestor', password: 'secreto123' });
    expect(create.status).toBe(201);
    expect(create.body.passwordHash).toBeUndefined();
    expect(create.body.rol).toBe('gestor');
    const id = create.body.id;

    const dup = await request(app.getHttpServer()).post('/admin/internal-users').set('Cookie', adminCookie)
      .send({ email, nombre: 'Otro', rol: 'gestor', password: 'secreto123' });
    expect(dup.status).toBe(409);

    const list = await request(app.getHttpServer()).get('/admin/internal-users').set('Cookie', adminCookie);
    expect(list.status).toBe(200);
    expect(list.body.find((u: any) => u.id === id)).toBeDefined();

    const upd = await request(app.getHttpServer()).patch(`/admin/internal-users/${id}`).set('Cookie', adminCookie)
      .send({ rol: 'admin', activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.rol).toBe('admin');
    expect(upd.body.activo).toBe(false);

    const del = await request(app.getHttpServer()).delete(`/admin/internal-users/${id}`).set('Cookie', adminCookie);
    expect(del.status).toBe(204);
  });

  it('admin NO puede borrarse a sí mismo -> 400', async () => {
    const me = await request(app.getHttpServer()).get('/auth/me').set('Cookie', adminCookie);
    const res = await request(app.getHttpServer()).delete(`/admin/internal-users/${me.body.id}`).set('Cookie', adminCookie);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run db:seed && npm run test:e2e -- admin-internal-users`
Expected: FAIL (rutas no existen).

- [ ] **Step 4: Implementar `InternalUsersService`**

`api/src/admin/internal-users.service.ts`:
```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

const VIEW = { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true } as const;

@Injectable()
export class InternalUsersService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  list() {
    return this.prisma.internalUser.findMany({ select: VIEW, orderBy: { createdAt: 'desc' } });
  }

  async create(email: string, nombre: string, rol: Rol, password: string) {
    const dup = await this.prisma.internalUser.findUnique({ where: { email }, select: { id: true } });
    if (dup) throw new ConflictException('El correo ya existe');
    const passwordHash = await this.passwords.hash(password);
    return this.prisma.internalUser.create({ data: { email, nombre, rol, passwordHash }, select: VIEW });
  }

  async update(id: string, data: { nombre?: string; rol?: Rol; activo?: boolean }) {
    const existing = await this.prisma.internalUser.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.internalUser.update({ where: { id }, data, select: VIEW });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException('No puedes eliminar tu propia cuenta');
    const existing = await this.prisma.internalUser.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.internalUser.delete({ where: { id } });
  }
}
```

- [ ] **Step 5: Implementar el controller; registrar en el módulo**

`api/src/admin/internal-users.controller.ts`:
```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { InternalUsersService } from './internal-users.service';
import { CreateInternalUserDto, UpdateInternalUserDto } from './dto/internal-user.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
@Controller('admin/internal-users')
export class InternalUsersController {
  constructor(private users: InternalUsersService) {}

  @Get()
  list() { return this.users.list(); }

  @Post()
  create(@Body() dto: CreateInternalUserDto) {
    return this.users.create(dto.email, dto.nombre, dto.rol, dto.password);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInternalUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.users.remove(id, user.id);
  }
}
```

En `api/src/admin/admin.module.ts`: añade `InternalUsersService` a `providers` y `InternalUsersController` a `controllers`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- admin-internal-users`
Expected: PASS (4/4).

- [ ] **Step 7: Commit**

```bash
git add api/src/admin api/test/admin-internal-users.e2e-spec.ts
git commit -m "feat(api): add admin-only internal users CRUD"
```

---

### Task 2: API CRUD de comercios (admin/gestor)

**Files:**
- Create: `api/src/admin/commerces-admin.service.ts`
- Create: `api/src/admin/commerces-admin.controller.ts`
- Create: `api/src/admin/dto/commerce-admin.dto.ts`
- Modify: `api/src/admin/admin.module.ts`
- Create: `api/test/admin-commerces.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `PasswordService`, `SessionGuard`, `RolesGuard`.
- Produces:
  - `CreateCommerceDto { nombre, descripcion?, porcentajeDescuento(int 0-100), email, password(min 8) }`.
  - `UpdateCommerceDto { nombre?, descripcion?, porcentajeDescuento?, activo? }`.
  - `CommerceAdminView = { id, nombre, descripcion, porcentajeDescuento, email, activo, createdAt }` (NUNCA passwordHash).
  - `CommercesAdminService.list()` (incluye inactivos), `.create(dto)` (409 email dup), `.update(id, dto)` (404), `.remove(id)` (404, 204).
  - `GET/POST /admin/commerces`, `PATCH/DELETE /admin/commerces/:id` — `@UseGuards(SessionGuard, RolesGuard)` + `@Roles('admin','gestor')`; DELETE 204.

- [ ] **Step 1: Escribir los DTOs**

`api/src/admin/dto/commerce-admin.dto.ts`:
```ts
import { IsEmail, IsInt, IsOptional, IsString, IsNotEmpty, IsBoolean, Min, Max, MinLength } from 'class-validator';

export class CreateCommerceDto {
  @IsString() @IsNotEmpty() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsInt() @Min(0) @Max(100) porcentajeDescuento: number;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class UpdateCommerceDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) porcentajeDescuento?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/admin-commerces.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin commerces', () => {
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
    await prisma.commerce.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/commerces');
    expect(res.status).toBe(401);
  });

  it('crea comercio y permite login del comercio con esa contraseña', async () => {
    const email = `com${Date.now()}@t.com`;
    const create = await request(app.getHttpServer()).post('/admin/commerces').set('Cookie', cookie)
      .send({ nombre: 'Tienda', descripcion: 'Ropa', porcentajeDescuento: 20, email, password: 'secreto123' });
    expect(create.status).toBe(201);
    expect(create.body.passwordHash).toBeUndefined();
    expect(create.body.porcentajeDescuento).toBe(20);
    ids.push(create.body.id);
    // el comercio recién creado puede iniciar sesión (verifica que el hash es válido)
    const clogin = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email, password: 'secreto123', remember: false });
    expect(clogin.status).toBe(201);
  });

  it('email duplicado -> 409', async () => {
    const email = `dup${Date.now()}@t.com`;
    const a = await request(app.getHttpServer()).post('/admin/commerces').set('Cookie', cookie)
      .send({ nombre: 'A', porcentajeDescuento: 10, email, password: 'secreto123' });
    ids.push(a.body.id);
    const b = await request(app.getHttpServer()).post('/admin/commerces').set('Cookie', cookie)
      .send({ nombre: 'B', porcentajeDescuento: 10, email, password: 'secreto123' });
    expect(b.status).toBe(409);
  });

  it('edita y borra', async () => {
    const email = `ed${Date.now()}@t.com`;
    const a = await request(app.getHttpServer()).post('/admin/commerces').set('Cookie', cookie)
      .send({ nombre: 'Editar', porcentajeDescuento: 10, email, password: 'secreto123' });
    const id = a.body.id;
    const upd = await request(app.getHttpServer()).patch(`/admin/commerces/${id}`).set('Cookie', cookie)
      .send({ porcentajeDescuento: 30, activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.porcentajeDescuento).toBe(30);
    const del = await request(app.getHttpServer()).delete(`/admin/commerces/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- admin-commerces`
Expected: FAIL (rutas no existen).

- [ ] **Step 4: Implementar `CommercesAdminService`**

`api/src/admin/commerces-admin.service.ts`:
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

const VIEW = { id: true, nombre: true, descripcion: true, porcentajeDescuento: true, email: true, activo: true, createdAt: true } as const;

@Injectable()
export class CommercesAdminService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  list() {
    return this.prisma.commerce.findMany({ select: VIEW, orderBy: { nombre: 'asc' } });
  }

  async create(nombre: string, descripcion: string | undefined, porcentajeDescuento: number, email: string, password: string) {
    const dup = await this.prisma.commerce.findUnique({ where: { email }, select: { id: true } });
    if (dup) throw new ConflictException('El correo ya existe');
    const passwordHash = await this.passwords.hash(password);
    return this.prisma.commerce.create({ data: { nombre, descripcion, porcentajeDescuento, email, passwordHash }, select: VIEW });
  }

  async update(id: string, data: { nombre?: string; descripcion?: string; porcentajeDescuento?: number; activo?: boolean }) {
    const existing = await this.prisma.commerce.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.commerce.update({ where: { id }, data, select: VIEW });
  }

  async remove(id: string) {
    const existing = await this.prisma.commerce.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.commerce.delete({ where: { id } });
  }
}
```

- [ ] **Step 5: Implementar el controller; registrar en el módulo**

`api/src/admin/commerces-admin.controller.ts`:
```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CommercesAdminService } from './commerces-admin.service';
import { CreateCommerceDto, UpdateCommerceDto } from './dto/commerce-admin.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/commerces')
export class CommercesAdminController {
  constructor(private commerces: CommercesAdminService) {}

  @Get()
  list() { return this.commerces.list(); }

  @Post()
  create(@Body() dto: CreateCommerceDto) {
    return this.commerces.create(dto.nombre, dto.descripcion, dto.porcentajeDescuento, dto.email, dto.password);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommerceDto) {
    return this.commerces.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.commerces.remove(id); }
}
```

En `api/src/admin/admin.module.ts`: añade `CommercesAdminService` a `providers` y `CommercesAdminController` a `controllers`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- admin-commerces`
Expected: PASS (4/4).

- [ ] **Step 7: Commit**

```bash
git add api/src/admin api/test/admin-commerces.e2e-spec.ts
git commit -m "feat(api): add admin commerces CRUD"
```

---

### Task 3: API de "mi perfil" (ver, editar, cambiar contraseña)

**Files:**
- Create: `api/src/admin/profile.service.ts`
- Create: `api/src/admin/profile.controller.ts`
- Create: `api/src/admin/dto/profile.dto.ts`
- Modify: `api/src/admin/admin.module.ts`
- Create: `api/test/admin-profile.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `PasswordService`, `SessionGuard`, `RolesGuard`, `@CurrentUser`.
- Produces:
  - `UpdateProfileDto { nombre?, email? }`; `ChangePasswordDto { currentPassword, newPassword(min 8) }`.
  - `ProfileService.get(id)` → `{id, email, nombre, rol}`; `.update(id, dto)` (409 si el email nuevo choca con otro usuario); `.changePassword(id, current, next)` (`BadRequestException` si `current` no verifica).
  - `GET /admin/me`, `PATCH /admin/me`, `POST /admin/me/password` — `@UseGuards(SessionGuard, RolesGuard)` + `@Roles('admin','gestor')`.

- [ ] **Step 1: Escribir los DTOs**

`api/src/admin/dto/profile.dto.ts`:
```ts
import { IsEmail, IsOptional, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/admin-profile.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Admin profile', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const email = `perfil${Date.now()}@t.com`;
  let userId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);
    const u = await prisma.internalUser.create({
      data: { email, passwordHash: await pass.hash('viejo1234'), nombre: 'Perfil', rol: 'gestor' },
    });
    userId = u.id;
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'viejo1234', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: userId } });
    await prisma.internalUser.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('GET /admin/me -> datos propios sin passwordHash', async () => {
    const res = await request(app.getHttpServer()).get('/admin/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('PATCH /admin/me edita el nombre', async () => {
    const res = await request(app.getHttpServer()).patch('/admin/me').set('Cookie', cookie).send({ nombre: 'Nuevo Nombre' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Nuevo Nombre');
  });

  it('cambio de contraseña con actual incorrecta -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/admin/me/password').set('Cookie', cookie)
      .send({ currentPassword: 'malo', newPassword: 'nuevo12345' });
    expect(res.status).toBe(400);
  });

  it('cambio de contraseña correcto y permite login con la nueva', async () => {
    const res = await request(app.getHttpServer()).post('/admin/me/password').set('Cookie', cookie)
      .send({ currentPassword: 'viejo1234', newPassword: 'nuevo12345' });
    expect(res.status).toBe(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'nuevo12345', remember: false });
    expect(login.status).toBe(201);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- admin-profile`
Expected: FAIL (rutas no existen).

- [ ] **Step 4: Implementar `ProfileService`**

`api/src/admin/profile.service.ts`:
```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

const VIEW = { id: true, email: true, nombre: true, rol: true } as const;

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  get(id: string) {
    return this.prisma.internalUser.findUniqueOrThrow({ where: { id }, select: VIEW });
  }

  async update(id: string, data: { nombre?: string; email?: string }) {
    if (data.email) {
      const dup = await this.prisma.internalUser.findUnique({ where: { email: data.email }, select: { id: true } });
      if (dup && dup.id !== id) throw new ConflictException('El correo ya está en uso');
    }
    return this.prisma.internalUser.update({ where: { id }, data, select: VIEW });
  }

  async changePassword(id: string, current: string, next: string) {
    const user = await this.prisma.internalUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    if (!(await this.passwords.verify(user.passwordHash, current))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    const passwordHash = await this.passwords.hash(next);
    await this.prisma.internalUser.update({ where: { id }, data: { passwordHash } });
  }
}
```

- [ ] **Step 5: Implementar el controller; registrar en el módulo**

`api/src/admin/profile.controller.ts`:
```ts
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/me')
export class ProfileController {
  constructor(private profile: ProfileService) {}

  @Get()
  get(@CurrentUser() user: any) { return this.profile.get(user.id); }

  @Patch()
  update(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) { return this.profile.update(user.id, dto); }

  @Post('password')
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    await this.profile.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }
}
```

En `api/src/admin/admin.module.ts`: añade `ProfileService` a `providers` y `ProfileController` a `controllers`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- admin-profile`
Expected: PASS (5/5).

- [ ] **Step 7: Correr toda la suite (sin regresiones)**

Run: `cd api && npm test && npm run test:e2e`
Expected: unit y e2e verdes (incluye admin-internal-users, admin-commerces, admin-profile además de lo anterior).

- [ ] **Step 8: Commit**

```bash
git add api/src/admin api/test/admin-profile.e2e-spec.ts
git commit -m "feat(api): add admin self-profile view/edit and password change"
```

---

### Task 4: Frontend — página de usuarios internos + nav por rol

**Files:**
- Modify: `web/src/app/(admin)/panel/layout.tsx`
- Create: `web/src/app/(admin)/panel/usuarios/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET/POST /admin/internal-users`, `PATCH/DELETE /admin/internal-users/:id`.
- Produces:
  - El nav del layout gana enlaces **Comercios** (`/panel/comercios`) y **Mi perfil** (`/panel/perfil`) para todos, y **Usuarios** (`/panel/usuarios`) SOLO si `me.rol === 'admin'`.
  - `/panel/usuarios` — lista de usuarios internos; crear (email, nombre, rol, password); activar/desactivar y cambiar rol (edición simple); borrar (con confirmación y feedback de error, p. ej. no auto-borrado 400).

- [ ] **Step 1: Actualizar el nav del layout**

En `web/src/app/(admin)/panel/layout.tsx`, dentro del `<nav>`, añade los enlaces (usa el `me.rol` ya disponible):
```tsx
<Link href="/panel/comercios">Comercios</Link>
{me.rol === 'admin' && <Link href="/panel/usuarios">Usuarios</Link>}
<Link href="/panel/perfil">Mi perfil</Link>
```
(colócalos junto a los enlaces existentes Inicio/Estudiantes/Intereses).

- [ ] **Step 2: Crear la página de usuarios internos**

`web/src/app/(admin)/panel/usuarios/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type User = { id: string; email: string; nombre: string; rol: 'admin' | 'gestor'; activo: boolean };

export default function UsuariosPage() {
  const [items, setItems] = useState<User[]>([]);
  const [f, setF] = useState({ email: '', nombre: '', rol: 'gestor', password: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/internal-users');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/internal-users', { method: 'POST', body: JSON.stringify(f) });
    if (res.ok) { setF({ email: '', nombre: '', rol: 'gestor', password: '' }); await load(); }
    else if (res.status === 409) setError('Ese correo ya existe.');
    else setError('Revisa los datos.');
  }

  async function toggleActivo(u: User) {
    const res = await api(`/admin/internal-users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !u.activo }) });
    if (res.ok) await load();
  }

  async function cambiarRol(u: User) {
    const rol = u.rol === 'admin' ? 'gestor' : 'admin';
    const res = await api(`/admin/internal-users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ rol }) });
    if (res.ok) await load();
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este usuario?')) return;
    const res = await api(`/admin/internal-users/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    else if (res.status === 400) setError('No puedes eliminar tu propia cuenta.');
    else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Usuarios internos</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Correo" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="rounded border p-2" placeholder="Nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <select className="rounded border p-2" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
          <option value="gestor">Gestor</option>
          <option value="admin">Administrador</option>
        </select>
        <input className="rounded border p-2" placeholder="Contraseña (mín. 8)" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear usuario</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{u.nombre} · {u.email} · <b>{u.rol}</b> {u.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => cambiarRol(u)}>Rol</button>
              <button className="text-blue-600" onClick={() => toggleActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(u.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y ruta**

Run: `cd web && npm run build`; con API + web arriba y sesión admin, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/panel/usuarios` → 200. Detén los servers.
Expected: build OK, ruta 200.

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add internal users admin page and role-gated nav"
```

---

### Task 5: Frontend — página de comercios

**Files:**
- Create: `web/src/app/(admin)/panel/comercios/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET/POST /admin/commerces`, `PATCH/DELETE /admin/commerces/:id`.
- Produces: `/panel/comercios` — lista de comercios (nombre, email, % descuento, activo); crear (nombre, descripción, % descuento, email, password); editar % y activar/desactivar; borrar (confirmación + feedback de error).

- [ ] **Step 1: Crear la página**

`web/src/app/(admin)/panel/comercios/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Commerce = { id: string; nombre: string; email: string; porcentajeDescuento: number; activo: boolean; descripcion?: string };

export default function ComerciosPage() {
  const [items, setItems] = useState<Commerce[]>([]);
  const [f, setF] = useState({ nombre: '', descripcion: '', porcentajeDescuento: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/commerces');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/commerces', {
      method: 'POST',
      body: JSON.stringify({ ...f, porcentajeDescuento: Number(f.porcentajeDescuento) }),
    });
    if (res.ok) { setF({ nombre: '', descripcion: '', porcentajeDescuento: '', email: '', password: '' }); await load(); }
    else if (res.status === 409) setError('Ese correo ya existe.');
    else setError('Revisa los datos.');
  }

  async function toggleActivo(c: Commerce) {
    const res = await api(`/admin/commerces/${c.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !c.activo }) });
    if (res.ok) await load();
  }

  async function editarDescuento(c: Commerce) {
    const v = prompt('Nuevo % de descuento (0-100)', String(c.porcentajeDescuento));
    if (v === null) return;
    const res = await api(`/admin/commerces/${c.id}`, { method: 'PATCH', body: JSON.stringify({ porcentajeDescuento: Number(v) }) });
    if (res.ok) await load(); else setError('No se pudo actualizar (¿0-100?).');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este comercio?')) return;
    const res = await api(`/admin/commerces/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Comercios</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <input className="rounded border p-2" placeholder="% descuento" type="number" min={0} max={100} required value={f.porcentajeDescuento} onChange={(e) => setF({ ...f, porcentajeDescuento: e.target.value })} />
        <input className="col-span-2 rounded border p-2" placeholder="Descripción" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        <input className="rounded border p-2" placeholder="Correo" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="rounded border p-2" placeholder="Contraseña (mín. 8)" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear comercio</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{c.nombre} · {c.email} · <b>{c.porcentajeDescuento}%</b> {c.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => editarDescuento(c)}>% Dcto</button>
              <button className="text-blue-600" onClick={() => toggleActivo(c)}>{c.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(c.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Verificar build y ruta**

Run: `cd web && npm run build`; con API + web arriba y sesión admin, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/panel/comercios` → 200. Detén los servers.
Expected: build OK, ruta 200.

- [ ] **Step 3: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add commerces admin page"
```

---

### Task 6: Frontend — página de "mi perfil"

**Files:**
- Create: `web/src/app/(admin)/panel/perfil/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET/PATCH /admin/me`, `POST /admin/me/password`.
- Produces: `/panel/perfil` — muestra y edita nombre/email; formulario para cambiar contraseña (actual + nueva) con feedback de éxito/error.

- [ ] **Step 1: Crear la página**

`web/src/app/(admin)/panel/perfil/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Me = { id: string; email: string; nombre: string; rol: string };

export default function PerfilAdminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    api('/admin/me').then(async (r) => {
      if (r.ok) { const m = await r.json(); setMe(m); setNombre(m.nombre); setEmail(m.email); }
    }).catch(() => {});
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSavedMsg('');
    const res = await api('/admin/me', { method: 'PATCH', body: JSON.stringify({ nombre, email }) });
    if (res.ok) { const m = await res.json(); setMe(m); setSavedMsg('Perfil actualizado.'); }
    else if (res.status === 409) setSavedMsg('Ese correo ya está en uso.');
    else setSavedMsg('No se pudo actualizar.');
  }

  async function cambiarPwd(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    const res = await api('/admin/me/password', { method: 'POST', body: JSON.stringify(pwd) });
    if (res.ok) { setPwd({ currentPassword: '', newPassword: '' }); setPwdMsg('Contraseña cambiada.'); }
    else if (res.status === 400) setPwdMsg('La contraseña actual es incorrecta o la nueva es muy corta.');
    else setPwdMsg('No se pudo cambiar.');
  }

  if (!me) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-gray-500">Rol: {me.rol}</p>
      </div>
      <form onSubmit={guardar} className="space-y-2">
        <input className="w-full rounded border p-2" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required />
        <input className="w-full rounded border p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" required />
        {savedMsg && <p className="text-sm text-green-600">{savedMsg}</p>}
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">Guardar</button>
      </form>
      <form onSubmit={cambiarPwd} className="space-y-2 border-t pt-4">
        <h2 className="text-sm font-medium">Cambiar contraseña</h2>
        <input className="w-full rounded border p-2" type="password" placeholder="Contraseña actual" required
          value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
        <input className="w-full rounded border p-2" type="password" placeholder="Nueva contraseña (mín. 8)" required
          value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
        {pwdMsg && <p className="text-sm text-green-600">{pwdMsg}</p>}
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">Cambiar contraseña</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Verificar build y ruta**

Run: `cd web && npm run build`; con API + web arriba y sesión admin, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/panel/perfil` → 200. Detén los servers.
Expected: build OK, ruta 200.

- [ ] **Step 3: Verificación E2E manual del panel completo**

Con API (`npm run start:dev`, `npm run db:seed`) y web arriba, con sesión admin: en **Usuarios** crea un gestor, cámbiale el rol/actívalo/desactívalo; en **Comercios** da de alta un comercio y verifica que puede iniciar sesión en `/comercio/ingresar`; en **Mi perfil** cambia tu nombre y tu contraseña, cierra sesión y entra con la nueva. Confirma que el enlace **Usuarios** NO aparece al entrar como gestor.
Expected: el panel de cuentas funciona de extremo a extremo; el gestor no ve ni accede a Usuarios (403).

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add admin self-profile page"
```

---

## Self-Review

**Spec coverage (Plan 06 vs spec §5):**
- Usuarios de la plataforma (CRUD de cuentas internas, roles Administrador/Gestor): Tasks 1, 4. ✅ (solo admin gestiona cuentas; gestor → 403).
- Mi perfil (editar datos propios del administrador): Tasks 3, 6. ✅ (+ cambio de contraseña).
- Comercios CRUD (alta desde el panel, cierra el "seed dev" del Plan 04): Tasks 2, 5. ✅
- El panel queda completo salvo catálogos de eventos/talleres/vacantes (planes posteriores).

**Placeholder scan:** sin TBD/TODO; todo el código completo e inline.

**Type consistency:** los tres servicios (`InternalUsersService`, `CommercesAdminService`, `ProfileService`) exponen `VIEW`-selects que NUNCA incluyen `passwordHash`. `@Roles('admin')` en usuarios internos vs `@Roles('admin','gestor')` en comercios/perfil, uniforme. `@CurrentUser()` provee `user.id` para no-auto-borrado y para "mi perfil". El frontend usa `me.rol==='admin'` (de `/auth/me`, ya disponible en el layout) para ocultar el enlace Usuarios; el backend lo refuerza con 403 (defensa en profundidad). Los comercios creados aquí son verificables por el `POST /commerce/login` del Plan 04 (mismo `PasswordService`).

## Próximos planes
- **07** — Puntos/niveles + eventos + QR check-in (staff escanea al joven; usa `nivelForPuntos`).
- **08** — Cursos/talleres + bolsa de trabajo (catálogos estudiante + admin CRUD). **09** — PWA. **10** — Hardening + despliegue.
