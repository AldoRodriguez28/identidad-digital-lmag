# Plan 04 — Comercios / beneficios (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un comercio afiliado inicie sesión y **escanee el QR de la credencial de un joven** para validar y aplicar su descuento, registrando cada uso; y que el joven vea el directorio de comercios afiliados.

**Architecture:** Se extiende la sesión de servidor polimórfica con un tercer principal `commerce` (junto a `internal_user`/`student`), con su `CommerceGuard`. Se añaden los modelos `Commerce` y `BenefitUsage`. El endpoint `POST /commerce/validate` recibe el `credentialToken` (leído del QR), valida al estudiante, registra un `BenefitUsage` y devuelve el nivel del joven + el % de descuento del comercio. La credencial del estudiante gana un código QR (que codifica su URL pública), y el comercio tiene una UI de escaneo (cámara + entrada manual de respaldo).

**Tech Stack:** NestJS, Prisma 6.19.3, argon2id (PasswordService), class-validator, Next.js 16 App Router, `qrcode.react` (generar QR), `html5-qrcode` (leer QR con cámara). Node 20.

## Global Constraints

- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx. Existe `api/.nvmrc`.
- **ORM Prisma 6.19.3** (NO 7). Postgres en `localhost:5432`, db `identidad_dev` (Docker: `docker compose up -d`).
- **Passwords argon2id** vía `PasswordService` (`hash`, `verify`). NO importar `argon2` (removido).
- **Auth por sesión de servidor** polimórfica, cookie `idsid` (httpOnly + secure(prod) + sameSite lax + remember). El principal se discrimina por `principalType`. Sin JWT.
- **Validación** con class-validator (`ValidationPipe` global: `whitelist:true, forbidNonWhitelisted:true, transform:true`).
- **Separación estricta de principals:** un comercio NO accede a endpoints de estudiante/admin y viceversa (cada guard exige su `principalType`).
- **No fuga de datos:** la validación devuelve del estudiante SOLO `nombreCompleto` y `nivel` (nada de correo/CURP/INE/domicilio). El directorio de beneficios expone del comercio solo `id, nombre, descripcion, porcentajeDescuento, logo`.
- **credentialToken** ya existe en `Student` (Plan 02/03), opaco, no derivado del CURP. El QR codifica la URL pública `/c/{token}`.
- **Alta de comercios:** por **seed en dev** en este plan (el CRUD desde el panel admin llega en Plan 05).
- **Suite e2e serializada:** `api/test/jest-e2e.json` ya tiene `maxWorkers:1` (no lo cambies).
- **Fuera de este plan:** panel admin de comercios/CRUD (Plan 05), reportes de uso, dedupe/rate-limit de validaciones (backlog), puntos por consumo en comercio (el uso de beneficio NO otorga puntos en v1).
- **Commits:** uno por tarea mínimo, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Modelos `Commerce` + `BenefitUsage`, principal `commerce`, seed

**Files:**
- Modify: `api/prisma/schema.prisma`
- Modify: `api/prisma/seed.ts`

**Interfaces:**
- Produces:
  - Enum `PrincipalType` gana el valor `commerce` (queda `internal_user | student | commerce`).
  - `Commerce { id, nombre, descripcion(String?), porcentajeDescuento(Int), logo(String?), email @unique, passwordHash, activo @default(true), createdAt, benefitUsages BenefitUsage[] }`.
  - `BenefitUsage { id, commerce(relation, onDelete Cascade), commerceId, student(relation, onDelete Cascade), studentId, createdAt }`.
  - `Student` gana la relación inversa `benefitUsages BenefitUsage[]`.
  - Seed idempotente de un comercio demo: `comercio@demo.local` / `Comercio123!`, `porcentajeDescuento=15`.

- [ ] **Step 1: Editar el schema**

En `api/prisma/schema.prisma`:
- añade `commerce` al enum `PrincipalType`:
```prisma
enum PrincipalType {
  internal_user
  student
  commerce
}
```
- añade a `Student` la relación inversa: `benefitUsages BenefitUsage[]`
- añade los modelos:
```prisma
model Commerce {
  id                 String         @id @default(cuid())
  nombre             String
  descripcion        String?
  porcentajeDescuento Int
  logo               String?
  email              String         @unique
  passwordHash       String
  activo             Boolean        @default(true)
  createdAt          DateTime       @default(now())
  benefitUsages      BenefitUsage[]
}

model BenefitUsage {
  id         String   @id @default(cuid())
  commerce   Commerce @relation(fields: [commerceId], references: [id], onDelete: Cascade)
  commerceId String
  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId  String
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 2: Aplicar la migración**

Run: `cd api && npx prisma migrate dev --name commerce_benefit_usage`
Expected: tablas `Commerce`, `BenefitUsage` creadas; enum actualizado; `prisma generate` corrido.

- [ ] **Step 3: Añadir el seed del comercio demo**

En `api/prisma/seed.ts`, dentro de `main()` (tras el seed de intereses), añade (reutiliza el `argon2id` de hash-wasm ya usado para el admin; usa EXACTAMENTE los mismos parámetros que el hash del admin en este archivo):
```ts
  const comercioEmail = 'comercio@demo.local';
  const comercioHash = await argon2id({
    password: 'Comercio123!', salt: randomBytes(16), parallelism: 1,
    iterations: 3, memorySize: 65536, hashLength: 32, outputType: 'encoded',
  });
  await prisma.commerce.upsert({
    where: { email: comercioEmail },
    update: {},
    create: { nombre: 'Cafetería Demo', descripcion: 'Café y postres', porcentajeDescuento: 15, email: comercioEmail, passwordHash: comercioHash },
  });
  console.log(`Seed comercio demo: ${comercioEmail}`);
```
(Confirma que `argon2id` de `hash-wasm` y `randomBytes` de `crypto` ya están importados arriba en `seed.ts`; si no, añádelos.)

- [ ] **Step 4: Correr el seed y verificar idempotencia**

Run: `cd api && npm run db:seed && npm run db:seed`
Expected: ambas corridas sin error; un solo comercio (upsert por email).

- [ ] **Step 5: Verificar tablas**

Run: `docker compose exec -T db psql -U identidad -d identidad_dev -c "\dt" | grep -E 'Commerce|BenefitUsage'`
Expected: aparecen `Commerce` y `BenefitUsage`.

- [ ] **Step 6: Commit**

```bash
git add api/prisma
git commit -m "feat(api): add Commerce and BenefitUsage models, commerce principal and seed"
```

---

### Task 2: Auth del comercio (CommerceGuard + login/logout/me)

**Files:**
- Create: `api/src/commerce/commerce.service.ts`
- Create: `api/src/commerce/commerce.controller.ts`
- Create: `api/src/commerce/commerce.module.ts`
- Create: `api/src/commerce/commerce.guard.ts`
- Create: `api/src/commerce/current-commerce.decorator.ts`
- Create: `api/src/commerce/dto/commerce-login.dto.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/commerce-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `SessionService`, `PasswordService` (de `AuthModule`), `PrismaService`.
- Produces:
  - `CommercePublicView = { id: string; nombre: string; porcentajeDescuento: number }`.
  - `CommerceService.login(email, password, remember): Promise<{ session, view }>` — 401 si credenciales inválidas o comercio inactivo; crea sesión `('commerce', commerce.id, remember)`.
  - `CommerceService.logout(sessionId)`, `CommerceService.toPublicView(commerce)`.
  - `CommerceGuard` — cookie → `principalType==='commerce'` → carga `Commerce` (activo) en `req.commerce`; 401 si no.
  - `@CurrentCommerce()` → `req.commerce`.
  - `CommerceLoginDto { email, password, remember? }`.
  - `POST /commerce/login` → set-cookie + `CommercePublicView`; `POST /commerce/logout`; `GET /commerce/me` (CommerceGuard) → `CommercePublicView`.

- [ ] **Step 1: Escribir el test e2e fallido**

`api/test/commerce-auth.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Commerce auth', () => {
  let app: INestApplication;
  const email = 'comercio@demo.local';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app.close());

  it('login inválido -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email, password: 'malo', remember: false });
    expect(res.status).toBe(401);
  });

  it('login válido (comercio semilla) -> cookie y /commerce/me', async () => {
    const login = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email, password: 'Comercio123!', remember: true });
    expect(login.status).toBe(201);
    expect(login.body.porcentajeDescuento).toBe(15);
    expect(login.body.passwordHash).toBeUndefined();
    const cookie = login.headers['set-cookie'];
    const me = await request(app.getHttpServer()).get('/commerce/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.nombre).toBeDefined();
  });

  it('/commerce/me sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/commerce/me');
    expect(res.status).toBe(401);
  });
});
```
(Requiere el comercio semilla: corre `npm run db:seed` antes si hace falta.)

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- commerce-auth`
Expected: FAIL (rutas no existen).

- [ ] **Step 3: Implementar guard, decorador, DTO**

`api/src/commerce/commerce.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../auth/session.service';

@Injectable()
export class CommerceGuard implements CanActivate {
  constructor(private sessions: SessionService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved || resolved.principalType !== 'commerce') throw new UnauthorizedException();
    const commerce = await this.prisma.commerce.findUnique({ where: { id: resolved.principalId } });
    if (!commerce || !commerce.activo) throw new UnauthorizedException();
    req.commerce = commerce;
    return true;
  }
}
```

`api/src/commerce/current-commerce.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentCommerce = createParamDecorator(
  (_data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().commerce,
);
```

`api/src/commerce/dto/commerce-login.dto.ts`:
```ts
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
export class CommerceLoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}
```

- [ ] **Step 4: Implementar el service**

`api/src/commerce/commerce.service.ts`:
```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Commerce } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';

export type CommercePublicView = { id: string; nombre: string; porcentajeDescuento: number };

@Injectable()
export class CommerceService {
  constructor(
    private prisma: PrismaService,
    private passwords: PasswordService,
    private sessions: SessionService,
  ) {}

  toPublicView(c: Commerce): CommercePublicView {
    return { id: c.id, nombre: c.nombre, porcentajeDescuento: c.porcentajeDescuento };
  }

  async login(email: string, password: string, remember: boolean) {
    const commerce = await this.prisma.commerce.findUnique({ where: { email } });
    if (!commerce || !commerce.activo || !(await this.passwords.verify(commerce.passwordHash, password))) {
      throw new UnauthorizedException();
    }
    const session = await this.sessions.create('commerce', commerce.id, remember);
    return { session, view: this.toPublicView(commerce) };
  }

  logout(sessionId: string) {
    return this.sessions.destroy(sessionId);
  }
}
```

- [ ] **Step 5: Implementar el controller y el módulo; registrar en AppModule**

`api/src/commerce/commerce.controller.ts`:
```ts
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommerceService } from './commerce.service';
import { CommerceLoginDto } from './dto/commerce-login.dto';
import { CommerceGuard } from './commerce.guard';
import { CurrentCommerce } from './current-commerce.decorator';

const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'idsid';
const DAY = 24 * 60 * 60 * 1000;

@Controller('commerce')
export class CommerceController {
  constructor(private commerce: CommerceService) {}

  @Post('login')
  async login(@Body() dto: CommerceLoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, view } = await this.commerce.login(dto.email, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: dto.remember ? 7 * DAY : DAY,
    });
    return view;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.commerce.logout(sid);
    res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    return { ok: true };
  }

  @UseGuards(CommerceGuard)
  @Get('me')
  me(@CurrentCommerce() commerce: any) {
    return this.commerce.toPublicView(commerce);
  }
}
```

`api/src/commerce/commerce.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';
import { CommerceGuard } from './commerce.guard';

@Module({
  imports: [AuthModule],
  controllers: [CommerceController],
  providers: [CommerceService, CommerceGuard],
  exports: [CommerceService, CommerceGuard],
})
export class CommerceModule {}
```

En `api/src/app.module.ts`, añade `CommerceModule` a `imports`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run db:seed && npm run test:e2e -- commerce-auth`
Expected: PASS (3/3).

- [ ] **Step 7: Commit**

```bash
git add api/src/commerce api/src/app.module.ts api/test/commerce-auth.e2e-spec.ts
git commit -m "feat(api): add commerce auth (login/logout/me) with CommerceGuard"
```

---

### Task 3: Validación de descuento `POST /commerce/validate`

**Files:**
- Modify: `api/src/commerce/commerce.service.ts`
- Modify: `api/src/commerce/commerce.controller.ts`
- Create: `api/src/commerce/dto/validate.dto.ts`
- Create: `api/test/commerce-validate.e2e-spec.ts`

**Interfaces:**
- Consumes: `CommerceGuard`, `@CurrentCommerce`, `PrismaService`.
- Produces:
  - `ValidateDto { credentialToken: string }`.
  - `CommerceService.validate(commerceId, porcentajeDescuento, credentialToken): Promise<ValidateResult>` — `NotFoundException` (404) si el token no corresponde a ningún estudiante. En éxito: crea `BenefitUsage` y devuelve `{ student: { nombreCompleto, nivel }, porcentajeDescuento }`.
  - `ValidateResult = { student: { nombreCompleto: string; nivel: string }; porcentajeDescuento: number }`.
  - `POST /commerce/validate` (CommerceGuard) → `ValidateResult`.

- [ ] **Step 1: Escribir el DTO**

`api/src/commerce/dto/validate.dto.ts`:
```ts
import { IsString, IsNotEmpty } from 'class-validator';
export class ValidateDto {
  @IsString() @IsNotEmpty() credentialToken: string;
}
```

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/commerce-validate.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Commerce validate', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const studentIds: string[] = [];
  let cookie: string;
  let token: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    // comercio semilla
    const login = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email: 'comercio@demo.local', password: 'Comercio123!', remember: false });
    cookie = login.headers['set-cookie'];
    // estudiante nuevo
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Val Estu', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo: `val${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    studentIds.push(reg.body.id);
    token = reg.body.credentialToken;
  });
  afterAll(async () => {
    await prisma.benefitUsage.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await app.close();
  });

  it('valida token -> devuelve nivel + descuento y registra uso', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/validate')
      .set('Cookie', cookie).send({ credentialToken: token });
    expect(res.status).toBe(201);
    expect(res.body.student.nombreCompleto).toBe('Val Estu');
    expect(res.body.student.nivel).toBe('bronce');
    expect(res.body.porcentajeDescuento).toBe(15);
    // NO debe filtrar datos sensibles del estudiante
    expect(res.body.student.correo).toBeUndefined();
    expect(res.body.student.curp).toBeUndefined();
    const count = await prisma.benefitUsage.count({ where: { studentId: studentIds[0] } });
    expect(count).toBe(1);
  });

  it('token inexistente -> 404', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/validate')
      .set('Cookie', cookie).send({ credentialToken: 'no-existe' });
    expect(res.status).toBe(404);
  });

  it('sin sesión de comercio -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/validate')
      .send({ credentialToken: token });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- commerce-validate`
Expected: FAIL (ruta no existe).

- [ ] **Step 4: Implementar `validate` en el service**

En `api/src/commerce/commerce.service.ts` añade `import { NotFoundException } from '@nestjs/common';` (junto a los existentes) y el método:
```ts
async validate(commerceId: string, porcentajeDescuento: number, credentialToken: string) {
  const student = await this.prisma.student.findUnique({
    where: { credentialToken },
    select: { id: true, nombreCompleto: true, nivel: true },
  });
  if (!student) throw new NotFoundException('Credencial no encontrada');
  await this.prisma.benefitUsage.create({ data: { commerceId, studentId: student.id } });
  return {
    student: { nombreCompleto: student.nombreCompleto, nivel: student.nivel },
    porcentajeDescuento,
  };
}
```

- [ ] **Step 5: Añadir el endpoint al controller**

En `api/src/commerce/commerce.controller.ts` añade el import del DTO y el endpoint:
```ts
// import { ValidateDto } from './dto/validate.dto';
@UseGuards(CommerceGuard)
@Post('validate')
validate(@CurrentCommerce() commerce: any, @Body() dto: ValidateDto) {
  return this.commerce.validate(commerce.id, commerce.porcentajeDescuento, dto.credentialToken);
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- commerce-validate`
Expected: PASS (3/3).

- [ ] **Step 7: Commit**

```bash
git add api/src/commerce api/test/commerce-validate.e2e-spec.ts
git commit -m "feat(api): add commerce discount validation endpoint recording benefit usage"
```

---

### Task 4: Directorio público de beneficios `GET /benefits`

**Files:**
- Create: `api/src/commerce/benefits.controller.ts`
- Modify: `api/src/commerce/commerce.service.ts`
- Modify: `api/src/commerce/commerce.module.ts`
- Create: `api/test/benefits.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces:
  - `CommerceService.listBenefits(): Promise<Array<{ id, nombre, descripcion, porcentajeDescuento, logo }>>` — solo comercios `activo=true`, ordenados por `nombre`.
  - `GET /benefits` (público) → esa lista.

- [ ] **Step 1: Escribir el test e2e fallido**

`api/test/benefits.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Benefits directory', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app.close());

  it('GET /benefits devuelve comercios activos con descuento (sin passwordHash)', async () => {
    const res = await request(app.getHttpServer()).get('/benefits');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const demo = res.body.find((c: any) => c.nombre === 'Cafetería Demo');
    expect(demo).toBeDefined();
    expect(demo.porcentajeDescuento).toBe(15);
    expect(demo.passwordHash).toBeUndefined();
    expect(demo.email).toBeUndefined();
  });
});
```
(Requiere el comercio semilla; corre `npm run db:seed` antes si hace falta.)

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- benefits`
Expected: FAIL (ruta no existe).

- [ ] **Step 3: Implementar `listBenefits` y el controller**

En `api/src/commerce/commerce.service.ts` añade:
```ts
listBenefits() {
  return this.prisma.commerce.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, descripcion: true, porcentajeDescuento: true, logo: true },
    orderBy: { nombre: 'asc' },
  });
}
```

`api/src/commerce/benefits.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';
import { CommerceService } from './commerce.service';

@Controller('benefits')
export class BenefitsController {
  constructor(private commerce: CommerceService) {}
  @Get()
  list() { return this.commerce.listBenefits(); }
}
```

En `api/src/commerce/commerce.module.ts`, añade `BenefitsController` a `controllers`.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- benefits`
Expected: PASS.

- [ ] **Step 5: Correr toda la suite (sin regresiones)**

Run: `cd api && npm test && npm run test:e2e`
Expected: unit y e2e verdes (incluye commerce-auth, commerce-validate, benefits además de lo anterior).

- [ ] **Step 6: Commit**

```bash
git add api/src/commerce api/test/benefits.e2e-spec.ts
git commit -m "feat(api): add public benefits directory endpoint"
```

---

### Task 5: Frontend — QR en la credencial + directorio de beneficios

**Files:**
- Modify: `web/src/app/c/[token]/page.tsx`
- Create: `web/src/app/(estudiante)/beneficios/page.tsx`
- Modify: `web/package.json` (dep `qrcode.react`)

**Interfaces:**
- Consumes: `api()`, `GET /benefits`.
- Produces:
  - La página de credencial `/c/[token]` muestra un **código QR** que codifica la URL pública de la credencial (`window.location.href`), para que un comercio lo escanee.
  - Página `/beneficios`: lista de comercios afiliados (nombre, descripción, % de descuento).

- [ ] **Step 1: Instalar la librería de QR**

Run: `cd web && npm install qrcode.react`

- [ ] **Step 2: Añadir el QR a la credencial**

En `web/src/app/c/[token]/page.tsx`, importa `QRCodeCanvas` y renderízalo dentro de la tarjeta (usa la URL actual del navegador, que es la credencial pública). Añade en la parte superior del componente:
```tsx
import { QRCodeCanvas } from 'qrcode.react';
```
Y dentro del render de la tarjeta (p.ej. tras los intereses), añade un bloque:
```tsx
{typeof window !== 'undefined' && (
  <div className="mt-6 flex justify-center">
    <QRCodeCanvas value={window.location.href} size={160} includeMargin />
  </div>
)}
```
(La página ya es client component `'use client'`, así que `window` está disponible en el render del cliente.)

- [ ] **Step 3: Crear la página de directorio de beneficios**

`web/src/app/(estudiante)/beneficios/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Benefit = { id: string; nombre: string; descripcion?: string; porcentajeDescuento: number; logo?: string };

export default function BeneficiosPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api('/benefits').then(async (r) => {
      if (r.ok) setBenefits(await r.json());
      else setError(true);
    }).catch(() => setError(true));
  }, []);

  if (error) return <main className="p-6">No se pudieron cargar los beneficios.</main>;

  return (
    <main className="mx-auto mt-10 max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">Beneficios</h1>
      {benefits.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no hay comercios afiliados.</p>
      ) : (
        <ul className="space-y-3">
          {benefits.map((b) => (
            <li key={b.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.nombre}</span>
                <span className="rounded-full bg-black px-3 py-1 text-sm text-white">{b.porcentajeDescuento}% dcto</span>
              </div>
              {b.descripcion && <p className="mt-1 text-sm text-gray-600">{b.descripcion}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verificar build y rutas**

Run: `cd web && npm run build`; luego `npm run dev` en background y `curl -s -o /dev/null -w "%{http_code}"` a `http://localhost:3000/beneficios` y `.../c/algun-token` → 200 ambos. Detén el server.
Expected: build OK, ambas rutas 200 (la credencial renderiza el QR en el cliente).

- [ ] **Step 5: Commit**

```bash
git add web/src/app web/package.json web/package-lock.json
git commit -m "feat(web): add credential QR code and student benefits directory"
```

---

### Task 6: Frontend — login del comercio + interfaz de escaneo/validación

**Files:**
- Create: `web/src/app/(comercio)/comercio/ingresar/page.tsx`
- Create: `web/src/app/(comercio)/comercio/validar/page.tsx`
- Modify: `web/package.json` (dep `html5-qrcode`)

**Interfaces:**
- Consumes: `api()`, `POST /commerce/login`, `GET /commerce/me`, `POST /commerce/validate`, `POST /commerce/logout`.
- Produces:
  - `/comercio/ingresar` — login del comercio → redirige a `/comercio/validar`.
  - `/comercio/validar` — guard client-side (`GET /commerce/me`, si no ok → `/comercio/ingresar`); permite **escanear el QR con la cámara** (html5-qrcode) o **pegar/escribir el token manualmente**; al validar, hace `POST /commerce/validate` y muestra nombre del joven, nivel y **% de descuento a aplicar**; botón de logout.

- [ ] **Step 1: Instalar la librería de escaneo**

Run: `cd web && npm install html5-qrcode`

- [ ] **Step 2: Revisar la guía de Next antes de escribir**

Existe `web/AGENTS.md` (Next 16 difiere del entrenamiento). Sigue el patrón de client components existentes (`web/src/app/(estudiante)/perfil/page.tsx` para el guard con `useEffect`). `html5-qrcode` se usa solo en el cliente dentro de `useEffect`.

- [ ] **Step 3: Crear la página de login del comercio**

`web/src/app/(comercio)/comercio/ingresar/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

export default function ComercioIngresarPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api('/commerce/login', { method: 'POST', body: JSON.stringify({ email, password, remember: true }) });
      if (res.ok) router.push('/comercio/validar');
      else setError('Credenciales inválidas.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Comercio — Iniciar sesión</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Correo" type="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" placeholder="Contraseña" type="password" required
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Crear la página de validación/escaneo**

`web/src/app/(comercio)/comercio/validar/page.tsx`:
```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../../lib/api';

type Result = { student: { nombreCompleto: string; nivel: string }; porcentajeDescuento: number };

// Extrae el credentialToken de un valor escaneado: acepta la URL `.../c/<token>` o el token pelón.
function extractToken(value: string): string {
  const trimmed = value.trim();
  const idx = trimmed.lastIndexOf('/c/');
  if (idx >= 0) return trimmed.slice(idx + 3).split(/[/?#]/)[0];
  return trimmed;
}

export default function ComercioValidarPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    api('/commerce/me').then((r) => {
      if (r.ok) setReady(true);
      else router.push('/comercio/ingresar');
    }).catch(() => router.push('/comercio/ingresar'));
  }, [router]);

  async function validate(rawValue: string) {
    setError(''); setResult(null);
    const credentialToken = extractToken(rawValue);
    if (!credentialToken) { setError('Token vacío.'); return; }
    try {
      const res = await api('/commerce/validate', { method: 'POST', body: JSON.stringify({ credentialToken }) });
      if (res.ok) setResult(await res.json());
      else if (res.status === 404) setError('Credencial no encontrada.');
      else setError('No se pudo validar.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  }

  async function startScan() {
    setError('');
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (decoded) => {
          await scanner.stop().catch(() => {});
          scannerRef.current = null;
          await validate(decoded);
        },
        () => {},
      );
    } catch {
      setError('No se pudo abrir la cámara. Usa la entrada manual.');
    }
  }

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  async function logout() {
    await api('/commerce/logout', { method: 'POST' });
    router.push('/comercio/ingresar');
  }

  if (!ready) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto mt-10 max-w-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Validar credencial</h1>
        <button className="rounded bg-gray-200 px-3 py-1 text-sm" onClick={logout}>Salir</button>
      </div>

      <div id="qr-reader" className="w-full" />
      <button className="w-full rounded bg-black p-2 text-white" onClick={startScan}>Escanear con cámara</button>

      <form onSubmit={(e) => { e.preventDefault(); validate(manual); }} className="space-y-2">
        <input className="w-full rounded border p-2" placeholder="…o pega el token / URL de la credencial"
          value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="w-full rounded border p-2" type="submit">Validar manualmente</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded-xl border p-4">
          <p className="text-lg font-semibold">{result.student.nombreCompleto}</p>
          <p className="text-sm">Nivel: <b>{result.student.nivel}</b></p>
          <p className="mt-2 text-2xl font-bold text-green-600">Aplicar {result.porcentajeDescuento}% de descuento</p>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Verificar build y rutas**

Run: `cd web && npm run build` (compila; `html5-qrcode` es solo cliente). Luego `npm run dev` en background y `curl -s -o /dev/null -w "%{http_code}"` a `http://localhost:3000/comercio/ingresar` y `.../comercio/validar` → 200 ambos. Detén el server.
Expected: build OK, ambas rutas 200 (validar redirige a ingresar si no hay sesión, pero la ruta responde 200).

- [ ] **Step 6: Verificación E2E manual del flujo completo**

Con API (`npm run start:dev`, `npm run db:seed`) y web arriba: registra un estudiante y abre su credencial `/c/{token}` (verás el QR). En otra pestaña entra a `/comercio/ingresar` con `comercio@demo.local` / `Comercio123!`; en `/comercio/validar`, pega la URL de la credencial (o el token) en la entrada manual y valida; confirma que muestra el nombre del joven, su nivel y "Aplicar 15% de descuento". Verifica en la BD que se creó un `BenefitUsage`.
Expected: el flujo funciona; se registra el uso.

- [ ] **Step 7: Commit**

```bash
git add web/src/app web/package.json web/package-lock.json
git commit -m "feat(web): add commerce login and QR scan/validate interface"
```

---

## Self-Review

**Spec coverage (Plan 04 vs spec §3.3 / §4 / módulo Beneficios):**
- 4º rol Comercio (solo escanea el QR de la credencial para validar descuento): Tasks 1, 2, 3. ✅
- `Commerce` y `BenefitUsage` (registro de uso para trazabilidad): Tasks 1, 3. ✅
- Directorio de comercios afiliados con % de descuento (lado estudiante): Tasks 4, 5. ✅
- El comercio escanea el QR de la credencial del joven → valida y muestra el descuento: Tasks 3, 6. ✅ (el uso de beneficio NO otorga puntos en v1, conforme al spec).
- QR en la credencial para ser escaneado: Task 5. ✅
- Alta de comercios desde el panel admin: **Plan 05** (aquí seed dev). Declarado.

**Placeholder scan:** sin TBD/TODO; todo el código completo e inline.

**Type consistency:** `SessionService.create('commerce', id, remember)` / `resolve → {principalType,principalId}` consistente con el resto. `CommercePublicView {id,nombre,porcentajeDescuento}` reutilizado en login/me. `CommerceGuard` pone `req.commerce`; `@CurrentCommerce` lo lee. `validate` devuelve `{student:{nombreCompleto,nivel}, porcentajeDescuento}` consumido por el frontend del comercio. `extractToken` en el frontend maneja tanto la URL `/c/{token}` (que codifica el QR de Task 5) como el token pelón.

**Nota de despliegue (backlog):** dedupe/rate-limit de validaciones (evitar doble registro por doble escaneo); alta/gestión de comercios desde el panel admin (Plan 05); CORS allowlist y demás pendientes generales.

## Próximos planes
- **05** — Panel admin/gestor + catálogos CRUD (usuarios internos, estudiantes con INE, intereses, eventos, comercios, talleres, vacantes) + dashboard.
- **06** — Puntos/niveles + eventos + QR check-in (staff escanea al joven). **07** — PWA.
