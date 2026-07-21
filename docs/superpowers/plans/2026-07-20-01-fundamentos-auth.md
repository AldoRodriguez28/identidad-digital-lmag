# Plan 01 — Fundamentos + Auth (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar el monorepo (NestJS API + Next.js web + Postgres) con autenticación por sesión de servidor, roles, y una cuenta de administrador semilla que puede iniciar y cerrar sesión.

**Architecture:** Monorepo con `api/` (NestJS + Prisma + PostgreSQL) y `web/` (Next.js App Router). La autenticación es por **sesión de servidor**: al hacer login se crea una fila en la tabla `Session` y se envía una cookie httpOnly con el id de sesión; un guard de NestJS resuelve la sesión en cada request. No hay JWT. Este plan entrega el esqueleto y el ciclo de login/logout del administrador; los flujos de estudiante/comercio se construyen en planes posteriores sobre esta base.

**Tech Stack:** NestJS, Prisma, PostgreSQL, argon2 (hash de password), nanoid, Next.js 14+ (App Router) + TypeScript + Tailwind, Vitest/Jest para pruebas, Docker Compose para Postgres local.

## Global Constraints

- **Backend:** NestJS + PostgreSQL. ORM: **Prisma**.
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **Auth:** sesión de servidor en Postgres, cookie **httpOnly + secure**, soporte "remember me". **Sin JWT.**
- **Passwords:** hash con **argon2id**. Nunca almacenar ni loggear password en claro.
- **Roles internos:** enum `admin | gestor`. Cuentas de estudiante y comercio viven en tablas separadas (planes 02 y 04).
- **Config:** todo por variables de entorno (`.env`), sin acoplarse a APIs propietarias de hosting.
- **Idioma del dominio/UX:** español.
- **Commits:** frecuentes, uno por tarea como mínimo. Este repo **aún no es git**: la Task 1 lo inicializa.

---

### Task 1: Inicializar monorepo y control de versiones

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `package.json` (raíz, workspaces)
- Create: `docker-compose.yml`

**Interfaces:**
- Produces: estructura de monorepo con workspaces `api` y `web`; Postgres local vía Docker en `localhost:5432`, db `identidad_dev`.

- [ ] **Step 1: Inicializar git y crear `.gitignore`**

`.gitignore`:
```
node_modules/
dist/
.next/
.env
.env.local
*.log
coverage/
```

- [ ] **Step 2: Crear `package.json` raíz con workspaces**

```json
{
  "name": "identidad-digital",
  "private": true,
  "workspaces": ["api", "web"],
  "scripts": {
    "db:up": "docker compose up -d",
    "db:down": "docker compose down"
  }
}
```

- [ ] **Step 3: Crear `docker-compose.yml` para Postgres**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: identidad
      POSTGRES_PASSWORD: identidad
      POSTGRES_DB: identidad_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- [ ] **Step 4: Levantar la base y verificar**

Run: `docker compose up -d && docker compose ps`
Expected: el servicio `db` aparece como `running` en el puerto 5432.

- [ ] **Step 5: Commit**

```bash
git init
git add .gitignore README.md package.json docker-compose.yml
git commit -m "chore: init monorepo with postgres compose"
```

---

### Task 2: Scaffold de la API NestJS + Prisma

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/nest-cli.json`
- Create: `api/.env.example`
- Create: `api/prisma/schema.prisma`
- Create: `api/src/main.ts`, `api/src/app.module.ts`
- Create: `api/src/prisma/prisma.service.ts`, `api/src/prisma/prisma.module.ts`

**Interfaces:**
- Produces: `PrismaService` (inyectable, extiende `PrismaClient`), API arranca en `http://localhost:3001`, endpoint `GET /health` devuelve `{ status: "ok" }`.

- [ ] **Step 1: Scaffold NestJS e instalar dependencias**

Run:
```bash
cd api
npx @nestjs/cli new . --skip-git --package-manager npm
npm install @prisma/client argon2 nanoid cookie-parser
npm install -D prisma @types/cookie-parser
```

- [ ] **Step 2: Definir `api/.env.example` y `.env`**

```
DATABASE_URL="postgresql://identidad:identidad@localhost:5432/identidad_dev?schema=public"
PORT=3001
SESSION_COOKIE_NAME=idsid
NODE_ENV=development
```
Copiar a `.env` real.

- [ ] **Step 3: Inicializar Prisma con un modelo mínimo de healthcheck**

`api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 4: Crear `PrismaService` y `PrismaModule`**

`api/src/prisma/prisma.service.ts`:
```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

`api/src/prisma/prisma.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

- [ ] **Step 5: Escribir la prueba fallida de `/health`**

`api/test/health.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('GET /health -> ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 6: Ejecutar la prueba y verificar que falla**

Run: `cd api && npm run test:e2e -- health`
Expected: FAIL (ruta `/health` no existe todavía → 404).

- [ ] **Step 7: Implementar `AppModule`, `main.ts` y el controlador de health**

`api/src/app.module.ts`:
```ts
import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Controller()
class HealthController {
  @Get('health')
  health() { return { status: 'ok' }; }
}

@Module({ imports: [PrismaModule], controllers: [HealthController] })
export class AppModule {}
```

`api/src/main.ts`:
```ts
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 8: Ejecutar la prueba y verificar que pasa**

Run: `cd api && npm run test:e2e -- health`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add api
git commit -m "feat(api): scaffold nestjs + prisma with health endpoint"
```

---

### Task 3: Esquema de datos base — InternalUser y Session

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/` (generado)

**Interfaces:**
- Produces: modelos `InternalUser` y `Session` en la BD.
  - `InternalUser { id, email(unique), passwordHash, nombre, rol(Rol), activo, createdAt }`
  - `Rol` enum `{ admin, gestor }`
  - `Session { id, internalUserId, expiresAt, remember, createdAt }` con relación a `InternalUser`.

- [ ] **Step 1: Añadir modelos al `schema.prisma`**

Agregar a `api/prisma/schema.prisma`:
```prisma
enum Rol {
  admin
  gestor
}

model InternalUser {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  nombre       String
  rol          Rol
  activo       Boolean   @default(true)
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id             String       @id @default(cuid())
  internalUser   InternalUser @relation(fields: [internalUserId], references: [id], onDelete: Cascade)
  internalUserId String
  expiresAt      DateTime
  remember       Boolean      @default(false)
  createdAt      DateTime     @default(now())
}
```

- [ ] **Step 2: Crear y aplicar la migración**

Run: `cd api && npx prisma migrate dev --name init_internal_user_session`
Expected: migración creada y aplicada; `npx prisma generate` corre automáticamente.

- [ ] **Step 3: Verificar en la BD**

Run: `cd api && npx prisma studio` (abrir y confirmar tablas `InternalUser` y `Session`), o `npx prisma db pull` para confirmar sin UI.
Expected: ambas tablas existen.

- [ ] **Step 4: Commit**

```bash
git add api/prisma
git commit -m "feat(api): add InternalUser and Session models"
```

---

### Task 4: Servicio de hashing de contraseñas

**Files:**
- Create: `api/src/auth/password.service.ts`
- Create: `api/src/auth/password.service.spec.ts`

**Interfaces:**
- Produces: `PasswordService` con
  - `hash(plain: string): Promise<string>`
  - `verify(hash: string, plain: string): Promise<boolean>`

- [ ] **Step 1: Escribir la prueba fallida**

`api/src/auth/password.service.spec.ts`:
```ts
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hash produce un valor distinto al texto plano', async () => {
    const h = await svc.hash('secreto123');
    expect(h).not.toBe('secreto123');
    expect(h.length).toBeGreaterThan(20);
  });

  it('verify true para la contraseña correcta y false para la incorrecta', async () => {
    const h = await svc.hash('secreto123');
    expect(await svc.verify(h, 'secreto123')).toBe(true);
    expect(await svc.verify(h, 'otra')).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm test -- password.service`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `PasswordService`**

`api/src/auth/password.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }
  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npm test -- password.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/password.service.ts api/src/auth/password.service.spec.ts
git commit -m "feat(api): add argon2 password service"
```

---

### Task 5: Servicio de sesiones

**Files:**
- Create: `api/src/auth/session.service.ts`
- Create: `api/src/auth/session.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `SessionService` con
  - `create(internalUserId: string, remember: boolean): Promise<Session>` (expira en 7 días si `remember`, 1 día si no)
  - `resolve(sessionId: string): Promise<{ user: InternalUser } | null>` (null si no existe o expiró)
  - `destroy(sessionId: string): Promise<void>`

- [ ] **Step 1: Escribir la prueba fallida (integración con BD de test)**

`api/src/auth/session.service.spec.ts`:
```ts
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const prisma = new PrismaService();
  const svc = new SessionService(prisma);
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const u = await prisma.internalUser.create({
      data: { email: `s${Date.now()}@t.com`, passwordHash: 'x', nombre: 'T', rol: 'admin' },
    });
    userId = u.id;
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { internalUserId: userId } });
    await prisma.internalUser.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('create + resolve devuelve el usuario', async () => {
    const s = await svc.create(userId, true);
    const r = await svc.resolve(s.id);
    expect(r?.user.id).toBe(userId);
  });

  it('destroy invalida la sesión', async () => {
    const s = await svc.create(userId, false);
    await svc.destroy(s.id);
    expect(await svc.resolve(s.id)).toBeNull();
  });

  it('resolve devuelve null para sesión expirada', async () => {
    const s = await svc.create(userId, false);
    await prisma.session.update({ where: { id: s.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await svc.resolve(s.id)).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm test -- session.service`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `SessionService`**

`api/src/auth/session.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  create(internalUserId: string, remember: boolean) {
    const ttl = remember ? 7 * DAY : DAY;
    return this.prisma.session.create({
      data: { internalUserId, remember, expiresAt: new Date(Date.now() + ttl) },
    });
  }

  async resolve(sessionId: string) {
    const s = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { internalUser: true },
    });
    if (!s || s.expiresAt.getTime() < Date.now()) return null;
    return { user: s.internalUser };
  }

  async destroy(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npm test -- session.service`
Expected: PASS (requiere Postgres arriba: `docker compose up -d`).

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/session.service.ts api/src/auth/session.service.spec.ts
git commit -m "feat(api): add session service with ttl and expiry"
```

---

### Task 6: Guard de sesión y decorador de roles

**Files:**
- Create: `api/src/auth/session.guard.ts`
- Create: `api/src/auth/roles.decorator.ts`
- Create: `api/src/auth/roles.guard.ts`
- Create: `api/src/auth/current-user.decorator.ts`
- Create: `api/src/auth/session.guard.spec.ts`

**Interfaces:**
- Consumes: `SessionService`, `SESSION_COOKIE_NAME` env.
- Produces:
  - `SessionGuard` — lee la cookie de sesión, adjunta `request.user` (InternalUser) o lanza 401.
  - `@Roles(...roles: Rol[])` + `RolesGuard` — 403 si el rol del usuario no está permitido.
  - `@CurrentUser()` — param decorator que devuelve `request.user`.

- [ ] **Step 1: Escribir la prueba fallida del guard**

`api/src/auth/session.guard.spec.ts`:
```ts
import { UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

function ctx(cookies: Record<string, string>) {
  const req: any = { cookies };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}

describe('SessionGuard', () => {
  it('lanza 401 si no hay cookie', async () => {
    const guard = new SessionGuard({ resolve: async () => null } as any);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adjunta user y permite si la sesión resuelve', async () => {
    const user = { id: 'u1', rol: 'admin' };
    const guard = new SessionGuard({ resolve: async () => ({ user }) } as any);
    const c = ctx({ idsid: 'sess1' });
    expect(await guard.canActivate(c)).toBe(true);
    expect(c._req.user).toEqual(user);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm test -- session.guard`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar guard, decoradores y roles guard**

`api/src/auth/session.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessions: SessionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved) throw new UnauthorizedException();
    req.user = resolved.user;
    return true;
  }
}
```

`api/src/auth/roles.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';
import { Rol } from '@prisma/client';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
```

`api/src/auth/roles.guard.ts`:
```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user || !required.includes(user.rol)) throw new ForbiddenException();
    return true;
  }
}
```

`api/src/auth/current-user.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npm test -- session.guard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/auth
git commit -m "feat(api): add session guard, roles guard and decorators"
```

---

### Task 7: Endpoints de login / logout / me + AuthModule

**Files:**
- Create: `api/src/auth/auth.service.ts`, `api/src/auth/auth.controller.ts`, `api/src/auth/auth.module.ts`
- Create: `api/src/auth/dto/login.dto.ts`
- Modify: `api/src/app.module.ts` (importar `AuthModule`)
- Create: `api/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `PasswordService`, `SessionService`, `SessionGuard`, `PrismaService`.
- Produces:
  - `POST /auth/login` { email, password, remember } → setea cookie httpOnly, devuelve `{ id, nombre, rol }`; 401 si credenciales inválidas o cuenta inactiva.
  - `POST /auth/logout` → destruye sesión y limpia cookie.
  - `GET /auth/me` (protegido por `SessionGuard`) → `{ id, nombre, rol }`.

- [ ] **Step 1: Escribir la prueba e2e fallida**

`api/test/auth.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `admin${Date.now()}@t.com`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);
    await prisma.internalUser.create({
      data: { email, passwordHash: await pass.hash('secreto123'), nombre: 'Admin', rol: 'admin' },
    });
  });
  afterAll(async () => {
    await prisma.session.deleteMany({});
    await prisma.internalUser.deleteMany({ where: { email } });
    await app.close();
  });

  it('login inválido -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login').send({ email, password: 'malo', remember: false });
    expect(res.status).toBe(401);
  });

  it('login válido -> cookie y me funciona', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login').send({ email, password: 'secreto123', remember: true });
    expect(login.status).toBe(201);
    expect(login.body.rol).toBe('admin');
    const cookie = login.headers['set-cookie'];
    expect(cookie).toBeDefined();

    const me = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.email === undefined || typeof me.body.rol === 'string').toBe(true);
    expect(me.body.rol).toBe('admin');
  });

  it('me sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- auth`
Expected: FAIL (rutas de auth no existen).

- [ ] **Step 3: Implementar DTO, service, controller y module**

`api/src/auth/dto/login.dto.ts`:
```ts
export class LoginDto {
  email: string;
  password: string;
  remember?: boolean;
}
```

`api/src/auth/auth.service.ts`:
```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private passwords: PasswordService,
    private sessions: SessionService,
  ) {}

  async login(email: string, password: string, remember: boolean) {
    const user = await this.prisma.internalUser.findUnique({ where: { email } });
    if (!user || !user.activo) throw new UnauthorizedException();
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      throw new UnauthorizedException();
    }
    const session = await this.sessions.create(user.id, remember);
    return { session, user: { id: user.id, nombre: user.nombre, rol: user.rol } };
  }

  logout(sessionId: string) {
    return this.sessions.destroy(sessionId);
  }
}
```

`api/src/auth/auth.controller.ts`:
```ts
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from './session.guard';
import { CurrentUser } from './current-user.decorator';

const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'idsid';
const DAY = 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, user } = await this.auth.login(dto.email, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: dto.remember ? 7 * DAY : DAY,
    });
    return user;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.auth.logout(sid);
    res.clearCookie(COOKIE);
    return { ok: true };
  }

  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return { id: user.id, nombre: user.nombre, rol: user.rol };
  }
}
```

`api/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, SessionGuard],
  exports: [PasswordService, SessionService, SessionGuard],
})
export class AuthModule {}
```

Modificar `api/src/app.module.ts` para importar `AuthModule` en `imports`.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/auth api/src/app.module.ts api/test/auth.e2e-spec.ts
git commit -m "feat(api): add login/logout/me session endpoints"
```

---

### Task 8: Script de seed del administrador

**Files:**
- Create: `api/prisma/seed.ts`
- Modify: `api/package.json` (script `prisma.seed` y `db:seed`)

**Interfaces:**
- Produces: comando `npm run db:seed` que crea (idempotente) un `InternalUser` admin con credenciales tomadas de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (fallback a valores de desarrollo).

- [ ] **Step 1: Añadir variables al `.env.example`**

```
SEED_ADMIN_EMAIL=admin@identidad.local
SEED_ADMIN_PASSWORD=Cambiar123!
```

- [ ] **Step 2: Escribir `prisma/seed.ts`**

`api/prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@identidad.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Cambiar123!';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.internalUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, nombre: 'Administrador', rol: 'admin' },
  });
  console.log(`Seed admin listo: ${email}`);
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Configurar el script de seed en `package.json`**

Agregar a `api/package.json`:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" },
"scripts": { "db:seed": "prisma db seed" }
```
(instalar `ts-node` como devDependency si no está: `npm i -D ts-node`)

- [ ] **Step 4: Ejecutar el seed y verificar (idempotente)**

Run: `cd api && npm run db:seed && npm run db:seed`
Expected: ambas ejecuciones terminan sin error; solo existe un admin (upsert).

- [ ] **Step 5: Verificar login del admin semilla end-to-end**

Run: levantar la API (`npm run start:dev`) y
```bash
curl -i -X POST localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@identidad.local","password":"Cambiar123!","remember":true}'
```
Expected: 201 con `set-cookie` y body `{"id":...,"nombre":"Administrador","rol":"admin"}`.

- [ ] **Step 6: Commit**

```bash
git add api/prisma/seed.ts api/package.json api/.env.example
git commit -m "feat(api): add idempotent admin seed script"
```

---

### Task 9: Scaffold del frontend Next.js + pantalla de login del panel

**Files:**
- Create: `web/` (scaffold Next.js App Router + Tailwind)
- Create: `web/.env.local.example`
- Create: `web/src/lib/api.ts`
- Create: `web/src/app/(admin)/login/page.tsx`
- Create: `web/src/app/(admin)/panel/page.tsx`

**Interfaces:**
- Consumes: endpoints `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` de la API.
- Produces: página `/login` que autentica contra la API (cookie de sesión) y redirige a `/panel`; `/panel` muestra el nombre/rol desde `/auth/me` y un botón de logout.

- [ ] **Step 1: Scaffold Next.js**

Run:
```bash
cd web
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --use-npm --no-import-alias
```

- [ ] **Step 2: Configurar variable de API base**

`web/.env.local.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
Copiar a `.env.local`.

- [ ] **Step 3: Crear helper de fetch con credenciales**

`web/src/lib/api.ts`:
```ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  return res;
}
```

- [ ] **Step 4: Crear la página de login**

`web/src/app/(admin)/login/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember }),
    });
    if (res.ok) router.push('/panel');
    else setError('Credenciales inválidas');
  }

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Panel — Iniciar sesión</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Correo"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" type="password" placeholder="Contraseña"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Mantener sesión iniciada
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Entrar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Crear la página de panel con logout**

`web/src/app/(admin)/panel/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function PanelPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    api('/auth/me').then(async (r) => {
      if (r.ok) setMe(await r.json());
      else router.push('/login');
    });
  }, [router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!me) return <main className="p-6">Cargando…</main>;
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Hola, {me.nombre} ({me.rol})</h1>
      <button className="mt-4 rounded bg-gray-200 px-3 py-1" onClick={logout}>Cerrar sesión</button>
    </main>
  );
}
```

- [ ] **Step 6: Verificación manual del ciclo completo**

Run: con API (`npm run start:dev` en `api/`) y web (`npm run dev` en `web/`) arriba y el seed aplicado, abrir `http://localhost:3000/login`, entrar con `admin@identidad.local` / `Cambiar123!`.
Expected: redirige a `/panel`, muestra "Hola, Administrador (admin)"; "Cerrar sesión" regresa a `/login` y recargar `/panel` vuelve a redirigir a login.

- [ ] **Step 7: Commit**

```bash
git add web
git commit -m "feat(web): scaffold next.js with admin login/panel against session api"
```

---

## Self-Review

**Spec coverage (Plan 01):** cubre los cimientos del punto 5 (arquitectura), punto 2 (roles internos admin/gestor con enum y guard), y el mecanismo base de sesión de servidor httpOnly + remember-me del punto "Auth". Los módulos de estudiante/comercio/catálogos y el `credential_token` se cubren en los planes 02–06 (fuera del alcance de este plan por decisión de decomposición). No hay requisitos del Plan 01 sin tarea.

**Placeholder scan:** sin TBD/TODO; todo el código está completo e inline.

**Type consistency:** `SessionService.resolve` devuelve `{ user }` y `SessionGuard` consume `resolved.user`; `AuthService.login` devuelve `{ session, user }` y el controller usa `session.id` y `user`. `Rol` enum consistente entre `roles.decorator`, `roles.guard` y los modelos Prisma. Nombres de cookie centralizados en `SESSION_COOKIE_NAME`.

## Próximos planes (a escribir tras cerrar el 01)
- **02** — Modelo `Student` + auto-registro público + login estudiante + reset de contraseña (Resend) + `credential_token` + perfil.
- **03** — Puntos/niveles + eventos + QR check-in (staff escanea).
- **04** — Comercios/beneficios (login comercio + escaneo + `BenefitUsage`).
- **05** — Catálogos (intereses, talleres, vacantes) + panel admin/gestor CRUD + dashboard + usuarios internos.
- **06** — PWA.
