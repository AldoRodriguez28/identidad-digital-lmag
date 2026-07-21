# Plan 02 — Estudiante: registro, auth y perfil (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un joven se auto-registre en público, inicie/cierre sesión, y vea/edite su perfil (con intereses), reutilizando la infraestructura de sesión del Plan 01.

**Architecture:** Se generaliza la tabla `Session` del Plan 01 (hoy solo admin) a un principal polimórfico (`internal_user | student`) para que estudiantes y staff compartan el mismo mecanismo de cookie de sesión. Se añaden los modelos `Student`, `Interest`, `StudentInterest`. Un módulo `students/` expone registro público, auth de estudiante (guard propio), y perfil. El frontend gana páginas de registro, ingreso y perfil.

**Tech Stack:** NestJS, Prisma 6.19.3 (PostgreSQL), argon2id vía hash-wasm (PasswordService existente), class-validator, Next.js App Router. Node 20.

## Global Constraints

- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx (Node 23 rompe Prisma). Existe `api/.nvmrc`.
- **ORM Prisma 6.19.3** (NO 7). Postgres corre en `localhost:5432`, db `identidad_dev` (Docker: `docker compose up -d`).
- **Auth por sesión de servidor**, cookie httpOnly + secure(en prod) + remember-me, nombre de cookie `process.env.SESSION_COOKIE_NAME ?? 'idsid'`. Sin JWT.
- **Passwords argon2id** vía el `PasswordService` existente (`hash(plain)`, `verify(hash, plain)`). NO importar `argon2` (removido).
- **Nunca** exponer `passwordHash` en respuestas ni logs. Validación de entrada con class-validator (`ValidationPipe` global ya registrado: `whitelist:true, forbidNonWhitelisted:true, transform:true`).
- **Auto-registro público:** la cuenta del estudiante queda **activa de inmediato** (sin verificación de email ni aprobación), nivel `bronce`, `puntosAcumulados = 0`, con un `credentialToken` no adivinable.
- **Niveles (umbrales exactos, sin solapamiento):** `bronce` 0–500, `plata` 501–1500, `oro` 1501–3000, `diamante` ≥3001.
- **credentialToken:** no adivinable y NO derivado del CURP. Se genera con `randomBytes(16).toString('base64url')` (built-in de Node, sin dependencias).
- **Fuera de este plan (→ Plan 03):** subida de INE (frente/reverso) a storage, página pública de credencial `/c/{token}`, recuperación de contraseña por email (Resend). En este plan los campos `ineFrente`/`ineReverso` existen pero son opcionales y no se capturan aún.
- **Commits:** uno por tarea mínimo, mensaje en el Step de commit, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Generalizar `Session` a principal polimórfico

**Files:**
- Modify: `api/prisma/schema.prisma`
- Modify: `api/src/auth/session.service.ts`
- Modify: `api/src/auth/session.service.spec.ts`
- Modify: `api/src/auth/session.guard.ts`
- Modify: `api/src/auth/session.guard.spec.ts`
- Modify: `api/src/auth/auth.service.ts`
- Modify: `api/src/auth/auth.module.ts`

**Interfaces:**
- Produces:
  - Enum Prisma `PrincipalType { internal_user student }`.
  - `Session { id, principalType, principalId, expiresAt, remember, createdAt }` (sin FK a InternalUser; índice en `[principalType, principalId]`).
  - `SessionService.create(principalType: PrincipalType, principalId: string, remember: boolean): Promise<Session>`
  - `SessionService.resolve(sessionId: string): Promise<{ principalType: PrincipalType; principalId: string } | null>` (solo valida expiración).
  - `SessionService.destroy(sessionId: string): Promise<void>` (sin cambios).
  - `SessionGuard` ahora resuelve, exige `principalType === 'internal_user'`, carga el `InternalUser` (activo) y lo pone en `req.user`; 401 si no. Inyecta `PrismaService`.
- Consumes: `PrismaService`.

- [ ] **Step 1: Actualizar el schema (enum + Session polimórfica), quitar la relación `sessions` de InternalUser**

En `api/prisma/schema.prisma`: elimina el campo `sessions Session[]` de `InternalUser`, y reemplaza el modelo `Session` y añade el enum:
```prisma
enum PrincipalType {
  internal_user
  student
}

model Session {
  id            String        @id @default(cuid())
  principalType PrincipalType
  principalId   String
  expiresAt     DateTime
  remember      Boolean       @default(false)
  createdAt     DateTime      @default(now())

  @@index([principalType, principalId])
}
```

- [ ] **Step 2: Crear la migración (dev DB es desechable)**

Run: `cd api && npx prisma migrate dev --name generalize_session_principal`
Si Prisma advierte que hay datos incompatibles y pide reset, ejecuta: `npx prisma migrate reset --force` (reaplica migraciones y corre el seed). Esto es aceptable: la BD de dev es desechable.
Expected: migración aplicada, `prisma generate` corrido, tabla `Session` con `principalType/principalId`.

- [ ] **Step 3: Actualizar el test de `SessionService` a la nueva firma**

Reemplaza `api/src/auth/session.service.spec.ts` por:
```ts
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const prisma = new PrismaService();
  const svc = new SessionService(prisma);

  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: 'p-test' } });
    await prisma.$disconnect();
  });

  it('create + resolve devuelve el principal', async () => {
    const s = await svc.create('internal_user', 'p-test', true);
    const r = await svc.resolve(s.id);
    expect(r).toEqual({ principalType: 'internal_user', principalId: 'p-test' });
  });

  it('destroy invalida la sesión', async () => {
    const s = await svc.create('student', 'p-test', false);
    await svc.destroy(s.id);
    expect(await svc.resolve(s.id)).toBeNull();
  });

  it('resolve null para sesión expirada', async () => {
    const s = await svc.create('student', 'p-test', false);
    await prisma.session.update({ where: { id: s.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await svc.resolve(s.id)).toBeNull();
  });

  it('create con remember=false expira en ~1 día', async () => {
    const s = await svc.create('student', 'p-test', false);
    const ms = s.expiresAt.getTime() - Date.now();
    expect(ms).toBeGreaterThan(23 * 3600 * 1000);
    expect(ms).toBeLessThan(25 * 3600 * 1000);
  });
});
```

- [ ] **Step 4: Ejecutar el test y verificar que falla**

Run: `cd api && npx jest session.service`
Expected: FAIL (la firma vieja `create(internalUserId, ...)` no coincide).

- [ ] **Step 5: Reescribir `SessionService`**

`api/src/auth/session.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrincipalType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  create(principalType: PrincipalType, principalId: string, remember: boolean) {
    const ttl = remember ? 7 * DAY : DAY;
    return this.prisma.session.create({
      data: { principalType, principalId, remember, expiresAt: new Date(Date.now() + ttl) },
    });
  }

  async resolve(sessionId: string) {
    const s = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!s || s.expiresAt.getTime() < Date.now()) return null;
    return { principalType: s.principalType, principalId: s.principalId };
  }

  async destroy(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }
}
```

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

Run: `cd api && npx jest session.service`
Expected: PASS (4/4).

- [ ] **Step 7: Actualizar `SessionGuard` (carga InternalUser) y su test**

`api/src/auth/session.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessions: SessionService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved || resolved.principalType !== 'internal_user') throw new UnauthorizedException();
    const user = await this.prisma.internalUser.findUnique({ where: { id: resolved.principalId } });
    if (!user || !user.activo) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}
```

Reemplaza `api/src/auth/session.guard.spec.ts` por:
```ts
import { UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

function ctx(cookies: Record<string, string>) {
  const req: any = { cookies };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}

describe('SessionGuard', () => {
  it('lanza 401 si no hay cookie', async () => {
    const guard = new SessionGuard({ resolve: async () => null } as any, {} as any);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza 401 si la sesión no resuelve', async () => {
    const guard = new SessionGuard({ resolve: async () => null } as any, {} as any);
    await expect(guard.canActivate(ctx({ idsid: 'x' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza 401 si el principal no es internal_user', async () => {
    const guard = new SessionGuard(
      { resolve: async () => ({ principalType: 'student', principalId: 's1' }) } as any,
      {} as any,
    );
    await expect(guard.canActivate(ctx({ idsid: 'x' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adjunta user y permite para internal_user activo', async () => {
    const user = { id: 'u1', rol: 'admin', activo: true };
    const prisma: any = { internalUser: { findUnique: async () => user } };
    const guard = new SessionGuard(
      { resolve: async () => ({ principalType: 'internal_user', principalId: 'u1' }) } as any,
      prisma,
    );
    const c = ctx({ idsid: 'x' });
    expect(await guard.canActivate(c)).toBe(true);
    expect(c._req.user).toEqual(user);
  });
});
```

- [ ] **Step 8: Actualizar `AuthService.login` a la nueva firma de `create` y registrar PrismaService en el guard**

En `api/src/auth/auth.service.ts`, cambia la creación de sesión:
```ts
const session = await this.sessions.create('internal_user', user.id, remember);
```
(el resto de `auth.service.ts` queda igual).

En `api/src/auth/auth.module.ts`, asegúrate de que `SessionGuard` pueda inyectar `PrismaService`. `PrismaModule` es `@Global()`, así que basta con que `SessionGuard` siga en `providers`. No hay cambios de imports necesarios; deja `auth.module.ts` como está.

- [ ] **Step 9: Ejecutar toda la suite (unit + e2e) y verificar verde**

Run: `cd api && npx jest session.service session.guard && npm run test:e2e`
Expected: unit de session PASS; e2e admin (`auth.e2e`) 5/5 PASS (el login/me/logout del admin sigue funcionando con la sesión generalizada). Si el reset borró el admin, corre `npm run db:seed` antes del e2e.

- [ ] **Step 10: Commit**

```bash
git add api/prisma api/src/auth
git commit -m "refactor(api): generalize session to polymorphic principal (internal_user|student)"
```

---

### Task 2: Modelos `Student`, `Interest`, `StudentInterest` + seed de intereses

**Files:**
- Modify: `api/prisma/schema.prisma`
- Modify: `api/prisma/seed.ts`

**Interfaces:**
- Produces: modelos Prisma:
  - `enum Nivel { bronce plata oro diamante }`
  - `Student` con todos los campos del dominio (ver Step 1), `credentialToken @unique`, `nivel @default(bronce)`, `puntosAcumulados @default(0)`.
  - `Interest { id, nombre @unique }` y `StudentInterest` (join con `@@id([studentId, interestId])`).
  - Seed idempotente de ~8 intereses base.

- [ ] **Step 1: Añadir modelos al schema**

Agrega a `api/prisma/schema.prisma`:
```prisma
enum Nivel {
  bronce
  plata
  oro
  diamante
}

model Student {
  id                     String   @id @default(cuid())
  nombreCompleto         String
  fechaNacimiento        DateTime
  curp                   String   @unique
  sexo                   String
  escolaridad            String
  anioVigenciaCredencial Int?
  correo                 String   @unique
  telefono               String
  calle                  String
  colonia                String
  codigoPostal           String
  numExt                 String
  numInt                 String?
  entreCalles            String?
  facebook               String?
  instagram              String?
  tiktok                 String?
  whatsapp               String?
  ineFrente              String?
  ineReverso             String?
  nivel                  Nivel    @default(bronce)
  puntosAcumulados       Int      @default(0)
  credentialToken        String   @unique
  passwordHash           String
  createdAt              DateTime @default(now())
  interests              StudentInterest[]
}

model Interest {
  id       String            @id @default(cuid())
  nombre   String            @unique
  students StudentInterest[]
}

model StudentInterest {
  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId  String
  interest   Interest @relation(fields: [interestId], references: [id], onDelete: Cascade)
  interestId String

  @@id([studentId, interestId])
}
```

- [ ] **Step 2: Aplicar migración**

Run: `cd api && npx prisma migrate dev --name student_interest_models`
Expected: tablas `Student`, `Interest`, `StudentInterest` creadas; `prisma generate` corrido.

- [ ] **Step 3: Añadir seed idempotente de intereses**

En `api/prisma/seed.ts`, dentro de `main()` (después del upsert del admin), añade:
```ts
  const intereses = ['Deporte', 'Música', 'Arte', 'Tecnología', 'Emprendimiento', 'Danza', 'Lectura', 'Cine'];
  for (const nombre of intereses) {
    await prisma.interest.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  console.log(`Seed intereses: ${intereses.length}`);
```

- [ ] **Step 4: Correr el seed y verificar (idempotente)**

Run: `cd api && npm run db:seed && npm run db:seed`
Expected: ambas corridas sin error; 8 intereses (upsert por `nombre`).

- [ ] **Step 5: Verificar tablas**

Run: `docker compose exec -T db psql -U identidad -d identidad_dev -c "\dt" | grep -E 'Student|Interest'`
Expected: aparecen `Student`, `Interest`, `StudentInterest`.

- [ ] **Step 6: Commit**

```bash
git add api/prisma
git commit -m "feat(api): add Student, Interest, StudentInterest models and interest seed"
```

---

### Task 3: Endpoint de lectura de intereses `GET /interests`

**Files:**
- Create: `api/src/interests/interests.controller.ts`
- Create: `api/src/interests/interests.service.ts`
- Create: `api/src/interests/interests.module.ts`
- Create: `api/test/interests.e2e-spec.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `GET /interests` (público) → `Array<{ id: string; nombre: string }>` ordenado por `nombre`.
  - `InterestsService.findAll(): Promise<{ id: string; nombre: string }[]>`

- [ ] **Step 1: Escribir el test e2e fallido**

`api/test/interests.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Interests', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app.close());

  it('GET /interests devuelve lista con id y nombre', async () => {
    const res = await request(app.getHttpServer()).get('/interests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('nombre');
  });
});
```
(requiere que el seed de intereses se haya corrido: `npm run db:seed`.)

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- interests`
Expected: FAIL (ruta `/interests` no existe → 404).

- [ ] **Step 3: Implementar service, controller, module**

`api/src/interests/interests.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InterestsService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.interest.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
```

`api/src/interests/interests.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';
import { InterestsService } from './interests.service';

@Controller('interests')
export class InterestsController {
  constructor(private interests: InterestsService) {}
  @Get()
  findAll() { return this.interests.findAll(); }
}
```

`api/src/interests/interests.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';

@Module({
  controllers: [InterestsController],
  providers: [InterestsService],
  exports: [InterestsService],
})
export class InterestsModule {}
```

En `api/src/app.module.ts`, añade `InterestsModule` a `imports`.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- interests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/interests api/src/app.module.ts api/test/interests.e2e-spec.ts
git commit -m "feat(api): add public GET /interests endpoint"
```

---

### Task 4: Helper de niveles `nivelForPuntos`

**Files:**
- Create: `api/src/students/nivel.ts`
- Create: `api/src/students/nivel.spec.ts`

**Interfaces:**
- Produces: `nivelForPuntos(puntos: number): Nivel` (enum de `@prisma/client`). Umbrales: `bronce` 0–500, `plata` 501–1500, `oro` 1501–3000, `diamante` ≥3001.

- [ ] **Step 1: Escribir el test fallido**

`api/src/students/nivel.spec.ts`:
```ts
import { nivelForPuntos } from './nivel';

describe('nivelForPuntos', () => {
  it('mapea los umbrales de nivel', () => {
    expect(nivelForPuntos(0)).toBe('bronce');
    expect(nivelForPuntos(500)).toBe('bronce');
    expect(nivelForPuntos(501)).toBe('plata');
    expect(nivelForPuntos(1500)).toBe('plata');
    expect(nivelForPuntos(1501)).toBe('oro');
    expect(nivelForPuntos(3000)).toBe('oro');
    expect(nivelForPuntos(3001)).toBe('diamante');
    expect(nivelForPuntos(999999)).toBe('diamante');
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npx jest nivel`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

`api/src/students/nivel.ts`:
```ts
import { Nivel } from '@prisma/client';

export function nivelForPuntos(puntos: number): Nivel {
  if (puntos <= 500) return 'bronce';
  if (puntos <= 1500) return 'plata';
  if (puntos <= 3000) return 'oro';
  return 'diamante';
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npx jest nivel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/students/nivel.ts api/src/students/nivel.spec.ts
git commit -m "feat(api): add nivelForPuntos level helper"
```

---

### Task 5: Auto-registro público del estudiante `POST /students/register`

**Files:**
- Create: `api/src/students/dto/register-student.dto.ts`
- Create: `api/src/students/students.service.ts`
- Create: `api/src/students/students.controller.ts`
- Create: `api/src/students/students.module.ts`
- Create: `api/test/students-register.e2e-spec.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `PasswordService` (de `AuthModule`, exportado), `nivelForPuntos`.
- Produces:
  - `RegisterStudentDto` (campos validados; ver Step 1).
  - `StudentsService.register(dto): Promise<StudentPublicView>` — hashea password, genera `credentialToken` con `randomBytes(16).toString('base64url')`, `nivel='bronce'`, `puntosAcumulados=0`. Lanza `ConflictException` (409) si `correo` o `curp` ya existen.
  - `StudentPublicView = { id, nombreCompleto, correo, nivel, puntosAcumulados, credentialToken }`.
  - `StudentsService.toPublicView(student): StudentPublicView` (helper reutilizable, NUNCA incluye passwordHash).
  - `POST /students/register` (público) → 201 + `StudentPublicView`.

- [ ] **Step 1: Escribir el DTO de registro**

`api/src/students/dto/register-student.dto.ts`:
```ts
import {
  IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, IsDateString, IsArray,
} from 'class-validator';

export class RegisterStudentDto {
  @IsString() @IsNotEmpty() nombreCompleto: string;
  @IsDateString() fechaNacimiento: string;
  @IsString() @IsNotEmpty() curp: string;
  @IsString() @IsNotEmpty() sexo: string;
  @IsString() @IsNotEmpty() escolaridad: string;
  @IsEmail() correo: string;
  @IsString() @IsNotEmpty() telefono: string;
  @IsString() @IsNotEmpty() calle: string;
  @IsString() @IsNotEmpty() colonia: string;
  @IsString() @IsNotEmpty() codigoPostal: string;
  @IsString() @IsNotEmpty() numExt: string;
  @IsString() @MinLength(8) password: string;

  @IsOptional() @IsString() numInt?: string;
  @IsOptional() @IsString() entreCalles?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() tiktok?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) interestIds?: string[];
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/students-register.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function payload(over: Partial<any> = {}) {
  const n = Date.now();
  return {
    nombreCompleto: 'Juan Pérez', fechaNacimiento: '2005-04-10', curp: `CURP${n}`,
    sexo: 'M', escolaridad: 'Preparatoria', correo: `juan${n}@t.com`, telefono: '555',
    calle: 'Av 1', colonia: 'Centro', codigoPostal: '91000', numExt: '10',
    password: 'secreto123', ...over,
  };
}

describe('Students register', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const created: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: created } } });
    await app.close();
  });

  it('registro válido -> 201 con vista pública (sin passwordHash) y credentialToken', async () => {
    const res = await request(app.getHttpServer()).post('/students/register').send(payload());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nivel).toBe('bronce');
    expect(res.body.puntosAcumulados).toBe(0);
    expect(typeof res.body.credentialToken).toBe('string');
    expect(res.body.credentialToken.length).toBeGreaterThan(15);
    expect(res.body.passwordHash).toBeUndefined();
    created.push(res.body.id);
  });

  it('correo duplicado -> 409', async () => {
    const p = payload();
    const a = await request(app.getHttpServer()).post('/students/register').send(p);
    created.push(a.body.id);
    const b = await request(app.getHttpServer()).post('/students/register').send({ ...payload(), correo: p.correo });
    expect(b.status).toBe(409);
  });

  it('body inválido (sin password) -> 400', async () => {
    const { password, ...bad } = payload();
    const res = await request(app.getHttpServer()).post('/students/register').send(bad);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- students-register`
Expected: FAIL (ruta no existe → 404).

- [ ] **Step 4: Implementar `StudentsService`**

`api/src/students/students.service.ts`:
```ts
import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { RegisterStudentDto } from './dto/register-student.dto';

export type StudentPublicView = {
  id: string; nombreCompleto: string; correo: string;
  nivel: string; puntosAcumulados: number; credentialToken: string;
};

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  toPublicView(s: Student): StudentPublicView {
    return {
      id: s.id, nombreCompleto: s.nombreCompleto, correo: s.correo,
      nivel: s.nivel, puntosAcumulados: s.puntosAcumulados, credentialToken: s.credentialToken,
    };
  }

  async register(dto: RegisterStudentDto): Promise<StudentPublicView> {
    const existing = await this.prisma.student.findFirst({
      where: { OR: [{ correo: dto.correo }, { curp: dto.curp }] },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Correo o CURP ya registrado');

    const passwordHash = await this.passwords.hash(dto.password);
    const credentialToken = randomBytes(16).toString('base64url');
    const { password, interestIds, fechaNacimiento, ...rest } = dto;

    const student = await this.prisma.student.create({
      data: {
        ...rest,
        fechaNacimiento: new Date(fechaNacimiento),
        passwordHash,
        credentialToken,
        interests: interestIds?.length
          ? { create: interestIds.map((interestId) => ({ interestId })) }
          : undefined,
      },
    });
    return this.toPublicView(student);
  }
}
```

- [ ] **Step 5: Implementar controller y module; registrar en AppModule**

`api/src/students/students.controller.ts`:
```ts
import { Body, Controller, Post } from '@nestjs/common';
import { StudentsService } from './students.service';
import { RegisterStudentDto } from './dto/register-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Post('register')
  register(@Body() dto: RegisterStudentDto) {
    return this.students.register(dto);
  }
}
```

`api/src/students/students.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
```

En `api/src/app.module.ts`, añade `StudentsModule` a `imports`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- students-register`
Expected: PASS (3/3).

- [ ] **Step 7: Commit**

```bash
git add api/src/students api/src/app.module.ts api/test/students-register.e2e-spec.ts
git commit -m "feat(api): add public student self-registration endpoint"
```

---

### Task 6: Auth del estudiante (StudentGuard + login/logout/me)

**Files:**
- Create: `api/src/students/student.guard.ts`
- Create: `api/src/students/current-student.decorator.ts`
- Create: `api/src/students/dto/student-login.dto.ts`
- Modify: `api/src/students/students.service.ts`
- Modify: `api/src/students/students.controller.ts`
- Modify: `api/src/students/students.module.ts`
- Create: `api/test/students-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `SessionService`, `PasswordService`, `PrismaService`.
- Produces:
  - `StudentLoginDto { correo: string; password: string; remember?: boolean }`.
  - `StudentsService.login(correo, password, remember): Promise<{ session, view }>` — 401 si credenciales inválidas; crea sesión `('student', student.id, remember)`.
  - `StudentGuard` — resuelve la cookie, exige `principalType === 'student'`, carga `Student`, lo pone en `req.student`; 401 si no.
  - `@CurrentStudent()` → `req.student`.
  - `POST /students/login` → set-cookie + `StudentPublicView`; `POST /students/logout`; `GET /students/me` (StudentGuard) → `StudentPublicView`.

- [ ] **Step 1: Escribir el test e2e fallido**

`api/test/students-auth.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function payload() {
  const n = Date.now();
  return {
    nombreCompleto: 'Ana', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
    escolaridad: 'Universidad', correo: `ana${n}@t.com`, telefono: '5', calle: 'c',
    colonia: 'x', codigoPostal: '91000', numExt: '1', password: 'secreto123',
  };
}

describe('Students auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let correo: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const p = payload(); correo = p.correo;
    const reg = await request(app.getHttpServer()).post('/students/register').send(p);
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('login inválido -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'malo', remember: false });
    expect(res.status).toBe(401);
  });

  it('login válido -> cookie y /students/me funciona', async () => {
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'secreto123', remember: true });
    expect(login.status).toBe(201);
    expect(login.body.credentialToken).toBeDefined();
    expect(login.body.passwordHash).toBeUndefined();
    const cookie = login.headers['set-cookie'];
    const me = await request(app.getHttpServer()).get('/students/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.correo).toBe(correo);
  });

  it('/students/me sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/students/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- students-auth`
Expected: FAIL (rutas login/me no existen).

- [ ] **Step 3: Implementar guard, decorador y DTO**

`api/src/students/student.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../auth/session.service';

@Injectable()
export class StudentGuard implements CanActivate {
  constructor(private sessions: SessionService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved || resolved.principalType !== 'student') throw new UnauthorizedException();
    const student = await this.prisma.student.findUnique({ where: { id: resolved.principalId } });
    if (!student) throw new UnauthorizedException();
    req.student = student;
    return true;
  }
}
```

`api/src/students/current-student.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentStudent = createParamDecorator(
  (_data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().student,
);
```

`api/src/students/dto/student-login.dto.ts`:
```ts
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
export class StudentLoginDto {
  @IsEmail() correo: string;
  @IsString() @IsNotEmpty() password: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}
```

- [ ] **Step 4: Añadir `login` a `StudentsService`**

En `api/src/students/students.service.ts`, importa `UnauthorizedException` y `SessionService`, inyéctalo en el constructor, y añade el método:
```ts
// en el constructor, añadir: private sessions: SessionService
async login(correo: string, password: string, remember: boolean) {
  const student = await this.prisma.student.findUnique({ where: { correo } });
  if (!student || !(await this.passwords.verify(student.passwordHash, password))) {
    throw new UnauthorizedException();
  }
  const session = await this.sessions.create('student', student.id, remember);
  return { session, view: this.toPublicView(student) };
}
```
Ajusta el import: `import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';` y `import { SessionService } from '../auth/session.service';`.

- [ ] **Step 5: Añadir endpoints al controller y registrar guard/proveedores**

Reemplaza `api/src/students/students.controller.ts` por:
```ts
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StudentsService } from './students.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { StudentGuard } from './student.guard';
import { CurrentStudent } from './current-student.decorator';

const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'idsid';
const DAY = 24 * 60 * 60 * 1000;

@Controller('students')
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Post('register')
  register(@Body() dto: RegisterStudentDto) {
    return this.students.register(dto);
  }

  @Post('login')
  async login(@Body() dto: StudentLoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, view } = await this.students.login(dto.correo, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: dto.remember ? 7 * DAY : DAY,
    });
    return view;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.students.logout(sid);
    res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax' });
    return { ok: true };
  }

  @UseGuards(StudentGuard)
  @Get('me')
  me(@CurrentStudent() student: any) {
    return this.students.toPublicView(student);
  }
}
```

En `api/src/students/students.service.ts`, añade el método `logout`:
```ts
logout(sessionId: string) {
  return this.sessions.destroy(sessionId);
}
```

En `api/src/students/students.module.ts`, añade `StudentGuard` a `providers`:
```ts
providers: [StudentsService, StudentGuard],
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- students-auth`
Expected: PASS (3/3).

- [ ] **Step 7: Commit**

```bash
git add api/src/students api/test/students-auth.e2e-spec.ts
git commit -m "feat(api): add student login/logout/me with StudentGuard"
```

---

### Task 7: Perfil del estudiante (ver/editar + intereses)

**Files:**
- Modify: `api/src/students/students.service.ts`
- Modify: `api/src/students/students.controller.ts`
- Create: `api/src/students/dto/update-profile.dto.ts`
- Create: `api/test/students-profile.e2e-spec.ts`

**Interfaces:**
- Consumes: `StudentGuard`, `PrismaService`.
- Produces:
  - `UpdateProfileDto` (todos opcionales: telefono, escolaridad, calle, colonia, codigoPostal, numExt, numInt, entreCalles, facebook, instagram, tiktok, whatsapp, `interestIds?: string[]`).
  - `StudentsService.getProfile(studentId): Promise<ProfileView>` — incluye datos + `interests: {id, nombre}[]`.
  - `StudentsService.updateProfile(studentId, dto): Promise<ProfileView>` — actualiza campos presentes; si viene `interestIds`, reemplaza el set de intereses.
  - `ProfileView = StudentPublicView & { telefono, escolaridad, calle, colonia, codigoPostal, numExt, numInt, entreCalles, facebook, instagram, tiktok, whatsapp, interests: {id,nombre}[] }`.
  - `GET /students/me/profile` (StudentGuard) → ProfileView; `PATCH /students/me/profile` (StudentGuard) → ProfileView.

- [ ] **Step 1: Escribir el DTO de actualización**

`api/src/students/dto/update-profile.dto.ts`:
```ts
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() escolaridad?: string;
  @IsOptional() @IsString() calle?: string;
  @IsOptional() @IsString() colonia?: string;
  @IsOptional() @IsString() codigoPostal?: string;
  @IsOptional() @IsString() numExt?: string;
  @IsOptional() @IsString() numInt?: string;
  @IsOptional() @IsString() entreCalles?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() tiktok?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) interestIds?: string[];
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/students-profile.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Students profile', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const ids: string[] = [];
  let interestId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Leo', fechaNacimiento: '2003-02-02', curp: `CURP${n}`, sexo: 'M',
      escolaridad: 'Prepa', correo: `leo${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo: `leo${n}@t.com`, password: 'secreto123', remember: false });
    cookie = login.headers['set-cookie'];
    const anInterest = await prisma.interest.findFirst();
    interestId = anInterest!.id;
  });
  afterAll(async () => {
    await prisma.studentInterest.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('GET perfil devuelve datos e intereses vacíos', async () => {
    const res = await request(app.getHttpServer()).get('/students/me/profile').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.telefono).toBe('5');
    expect(Array.isArray(res.body.interests)).toBe(true);
    expect(res.body.interests.length).toBe(0);
  });

  it('PATCH actualiza teléfono y set de intereses', async () => {
    const res = await request(app.getHttpServer()).patch('/students/me/profile').set('Cookie', cookie)
      .send({ telefono: '9999', interestIds: [interestId] });
    expect(res.status).toBe(200);
    expect(res.body.telefono).toBe('9999');
    expect(res.body.interests.map((i: any) => i.id)).toEqual([interestId]);
  });

  it('PATCH sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).patch('/students/me/profile').send({ telefono: '1' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- students-profile`
Expected: FAIL (rutas de perfil no existen).

- [ ] **Step 4: Implementar `getProfile` y `updateProfile` en `StudentsService`**

Añade a `api/src/students/students.service.ts`:
```ts
private async buildProfile(studentId: string) {
  const s = await this.prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { interests: { include: { interest: { select: { id: true, nombre: true } } } } },
  });
  return {
    ...this.toPublicView(s),
    telefono: s.telefono, escolaridad: s.escolaridad, calle: s.calle, colonia: s.colonia,
    codigoPostal: s.codigoPostal, numExt: s.numExt, numInt: s.numInt, entreCalles: s.entreCalles,
    facebook: s.facebook, instagram: s.instagram, tiktok: s.tiktok, whatsapp: s.whatsapp,
    interests: s.interests.map((si) => si.interest),
  };
}

getProfile(studentId: string) {
  return this.buildProfile(studentId);
}

async updateProfile(studentId: string, dto: import('./dto/update-profile.dto').UpdateProfileDto) {
  const { interestIds, ...fields } = dto;
  await this.prisma.student.update({ where: { id: studentId }, data: fields });
  if (interestIds) {
    await this.prisma.studentInterest.deleteMany({ where: { studentId } });
    if (interestIds.length) {
      await this.prisma.studentInterest.createMany({
        data: interestIds.map((interestId) => ({ studentId, interestId })),
      });
    }
  }
  return this.buildProfile(studentId);
}
```

- [ ] **Step 5: Añadir los endpoints al controller**

Añade a `api/src/students/students.controller.ts` (importa `Get`, `Patch` ya disponibles de `@nestjs/common`; añade `Patch` al import y el DTO):
```ts
// import { ..., Patch } from '@nestjs/common';
// import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(StudentGuard)
@Get('me/profile')
getProfile(@CurrentStudent() student: any) {
  return this.students.getProfile(student.id);
}

@UseGuards(StudentGuard)
@Patch('me/profile')
updateProfile(@CurrentStudent() student: any, @Body() dto: UpdateProfileDto) {
  return this.students.updateProfile(student.id, dto);
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- students-profile`
Expected: PASS (3/3).

- [ ] **Step 7: Correr toda la suite y confirmar sin regresiones**

Run: `cd api && npm test && npm run test:e2e`
Expected: unit verde; e2e todos verdes (auth admin, interests, students-register, students-auth, students-profile, health).

- [ ] **Step 8: Commit**

```bash
git add api/src/students api/test/students-profile.e2e-spec.ts
git commit -m "feat(api): add student profile get/update with interests"
```

---

### Task 8: Frontend — página de auto-registro del estudiante

**Files:**
- Create: `web/src/app/(estudiante)/registro/page.tsx`

**Interfaces:**
- Consumes: `api()` (`web/src/lib/api.ts`), `GET /interests`, `POST /students/register`.
- Produces: página `/registro` con formulario de campos requeridos + multi-select de intereses; en éxito redirige a `/ingresar`.

- [ ] **Step 1: Antes de escribir, leer la guía de Next**

Existe `web/AGENTS.md` avisando que esta versión de Next.js difiere del conocimiento previo. Revisa `web/node_modules/next/dist/docs/` para confirmar la API de `useRouter`/`'use client'`/rutas antes de escribir. El patrón ya usado y funcionando está en `web/src/app/(admin)/login/page.tsx` — síguelo.

- [ ] **Step 2: Crear la página de registro**

`web/src/app/(estudiante)/registro/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type Interest = { id: string; nombre: string };

export default function RegistroPage() {
  const router = useRouter();
  const [f, setF] = useState({
    nombreCompleto: '', fechaNacimiento: '', curp: '', sexo: '', escolaridad: '',
    correo: '', telefono: '', calle: '', colonia: '', codigoPostal: '', numExt: '', password: '',
  });
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/interests').then(async (r) => { if (r.ok) setInterests(await r.json()); }).catch(() => {});
  }, []);

  function set(k: string, v: string) { setF((prev) => ({ ...prev, [k]: v })); }
  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/students/register', {
        method: 'POST',
        body: JSON.stringify({ ...f, interestIds: selected }),
      });
      if (res.ok) router.push('/ingresar');
      else if (res.status === 409) setError('El correo o CURP ya está registrado.');
      else setError('Revisa los datos del formulario.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  }

  const fields: [string, string, string?][] = [
    ['nombreCompleto', 'Nombre completo'], ['fechaNacimiento', 'Fecha de nacimiento', 'date'],
    ['curp', 'CURP'], ['sexo', 'Sexo'], ['escolaridad', 'Escolaridad'],
    ['correo', 'Correo', 'email'], ['telefono', 'Teléfono'], ['calle', 'Calle'],
    ['colonia', 'Colonia'], ['codigoPostal', 'Código postal'], ['numExt', 'Número exterior'],
    ['password', 'Contraseña (mín. 8)', 'password'],
  ];

  return (
    <main className="mx-auto mt-10 max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">Crear mi cuenta</h1>
      <form onSubmit={submit} className="space-y-3">
        {fields.map(([k, label, type]) => (
          <input key={k} className="w-full rounded border p-2" placeholder={label}
            type={type ?? 'text'} value={(f as any)[k]}
            onChange={(e) => set(k, e.target.value)} />
        ))}
        <div>
          <p className="mb-1 text-sm font-medium">Intereses</p>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <button type="button" key={i.id} onClick={() => toggle(i.id)}
                className={`rounded-full border px-3 py-1 text-sm ${selected.includes(i.id) ? 'bg-black text-white' : ''}`}>
                {i.nombre}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Registrarme</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y render**

Run: `cd web && npm run build` (debe compilar) y luego `npm run dev` en background; `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/registro` debe ser 200. Detén el server.
Expected: build OK, `/registro` 200.

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add student self-registration page"
```

---

### Task 9: Frontend — ingreso y perfil del estudiante

**Files:**
- Create: `web/src/app/(estudiante)/ingresar/page.tsx`
- Create: `web/src/app/(estudiante)/perfil/page.tsx`

**Interfaces:**
- Consumes: `api()`, `POST /students/login`, `GET /students/me/profile`, `PATCH /students/me/profile`, `POST /students/logout`, `GET /interests`.
- Produces: `/ingresar` (login del estudiante → redirige a `/perfil`); `/perfil` (muestra datos, nivel, puntos; edita teléfono e intereses; logout).

- [ ] **Step 1: Crear la página de ingreso**

`web/src/app/(estudiante)/ingresar/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function IngresarPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/students/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password, remember }),
      });
      if (res.ok) router.push('/perfil');
      else setError('Correo o contraseña incorrectos.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Ingresar</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Correo" type="email"
          value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input className="w-full rounded border p-2" placeholder="Contraseña" type="password"
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

- [ ] **Step 2: Crear la página de perfil**

`web/src/app/(estudiante)/perfil/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type Interest = { id: string; nombre: string };
type Profile = {
  nombreCompleto: string; correo: string; nivel: string; puntosAcumulados: number;
  telefono: string; interests: Interest[];
};

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [telefono, setTelefono] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/students/me/profile').then(async (r) => {
      if (!r.ok) { router.push('/ingresar'); return; }
      const p: Profile = await r.json();
      setProfile(p); setTelefono(p.telefono);
      setSelected(p.interests.map((i) => i.id));
    }).catch(() => router.push('/ingresar'));
    api('/interests').then(async (r) => { if (r.ok) setAllInterests(await r.json()); }).catch(() => {});
  }, [router]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  async function save() {
    setSaved(false);
    const res = await api('/students/me/profile', {
      method: 'PATCH', body: JSON.stringify({ telefono, interestIds: selected }),
    });
    if (res.ok) { setProfile(await res.json()); setSaved(true); }
  }
  async function logout() {
    await api('/students/logout', { method: 'POST' });
    router.push('/ingresar');
  }

  if (!profile) return <main className="p-6">Cargando…</main>;
  return (
    <main className="mx-auto mt-10 max-w-lg p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{profile.nombreCompleto}</h1>
        <p className="text-sm text-gray-600">{profile.correo}</p>
        <p className="mt-1">Nivel: <b>{profile.nivel}</b> · Puntos: <b>{profile.puntosAcumulados}</b></p>
      </div>
      <div>
        <label className="text-sm font-medium">Teléfono</label>
        <input className="mt-1 w-full rounded border p-2" value={telefono}
          onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Intereses</p>
        <div className="flex flex-wrap gap-2">
          {allInterests.map((i) => (
            <button type="button" key={i.id} onClick={() => toggle(i.id)}
              className={`rounded-full border px-3 py-1 text-sm ${selected.includes(i.id) ? 'bg-black text-white' : ''}`}>
              {i.nombre}
            </button>
          ))}
        </div>
      </div>
      {saved && <p className="text-sm text-green-600">Guardado.</p>}
      <div className="flex gap-2">
        <button className="rounded bg-black px-4 py-2 text-white" onClick={save}>Guardar</button>
        <button className="rounded bg-gray-200 px-4 py-2" onClick={logout}>Cerrar sesión</button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y render**

Run: `cd web && npm run build`; luego `npm run dev` en background y `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ingresar` y `.../perfil` → 200 ambos. Detén el server.
Expected: build OK, ambas rutas 200.

- [ ] **Step 4: Verificación E2E manual del flujo completo (con API + web arriba, seed corrido)**

Con la API (`npm run start:dev` en api/) y web (`npm run dev`) arriba: abre `http://localhost:3000/registro`, crea una cuenta, verifica redirección a `/ingresar`, entra, y en `/perfil` cambia el teléfono + intereses y guarda; recarga y confirma que persistió; cierra sesión y confirma que `/perfil` redirige a `/ingresar`.
Expected: flujo completo funciona; nivel `bronce`, puntos `0`.

- [ ] **Step 5: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add student login and profile pages"
```

---

## Self-Review

**Spec coverage (Plan 02 vs spec §3.1):**
- Registro (auto-registro público, activo inmediato, nivel bronce/0 puntos, credentialToken): Tasks 5, 8. ✅ (INE diferido a Plan 03 — declarado en Global Constraints).
- Login estudiante + "mantener sesión": Tasks 6, 9. ✅
- Perfil (nivel, puntos, datos editables, intereses multi-select, redes): Tasks 7, 9. ✅
- Niveles (umbrales): Task 4. ✅ (progreso/historial de puntos = plan de puntos, fuera de este plan).
- Catálogo de intereses (lectura para el estudiante): Task 3. ✅ (CRUD admin = Plan 05).
- Credencial digital `/c/{token}`, INE, reset de contraseña: **diferidos a Plan 03** (declarado).

**Placeholder scan:** sin TBD/TODO; todo el código está completo e inline.

**Type consistency:** `SessionService.create(principalType, principalId, remember)` y `resolve → {principalType, principalId}` usados igual en `SessionGuard`, `StudentGuard`, `AuthService` y `StudentsService`. `PrincipalType` valores `'internal_user'|'student'` consistentes. `toPublicView`/`StudentPublicView` reutilizados en register/login/me. `credentialToken` generado con `randomBytes(16).toString('base64url')` en un solo lugar (Task 5). Cookie `idsid` compartida por ambos principales.

## Próximos planes
- **03** — Credencial digital pública `/c/{token}` + subida de INE (StorageService con adaptador local, R2-ready) + recuperación de contraseña (EmailService con transporte dev, Resend-ready).
- **04** — Comercios/beneficios. **05** — Panel admin/gestor + catálogos CRUD. **06** — Puntos/eventos + QR. **07** — PWA.
