# Plan 03 — Credencial pública + INE (storage) + reset de contraseña (email) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar la v1 del estudiante: página pública de credencial por token no adivinable, subida de INE (frente/reverso) a un storage abstracto, y recuperación de contraseña por email — las tres detrás de interfaces que funcionan en dev sin credenciales externas.

**Architecture:** Dos abstracciones nuevas con adaptadores de desarrollo: `StorageService` (adaptador `LocalDiskStorage`, listo para R2 luego) para las imágenes de INE, y `EmailService` (adaptador `DevEmailService` que escribe a consola, listo para Resend). La credencial se sirve pública por `credentialToken` exponiendo SOLO campos no sensibles. El reset usa un modelo `PasswordReset` con tokens de un solo uso y expiración, sin filtrar si un correo existe.

**Tech Stack:** NestJS (+ @nestjs/platform-express/multer para multipart), Prisma 6.19.3, argon2id (PasswordService), class-validator, Next.js 16 App Router. Node 20.

## Global Constraints

- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx (Node 23 rompe Prisma). Existe `api/.nvmrc`.
- **ORM Prisma 6.19.3** (NO 7). Postgres en `localhost:5432`, db `identidad_dev` (Docker: `docker compose up -d`).
- **Passwords argon2id** vía `PasswordService` (`hash(plain)`, `verify(hash, plain)`). NO importar `argon2` (removido).
- **Validación** con class-validator (`ValidationPipe` global ya activo: `whitelist:true, forbidNonWhitelisted:true, transform:true`).
- **Tokens no adivinables** con `randomBytes(...).toString('base64url')` (built-in `crypto`). El `credentialToken` del estudiante ya existe (Plan 02).
- **Credencial pública:** `GET /c/{credentialToken}` expone SOLO `nombreCompleto, nivel, edad, escolaridad, colonia, intereses[], redes{}`. NUNCA `correo, curp, telefono, domicilio completo, ineFrente/Reverso, passwordHash`.
- **INE = dato sensible:** en este plan solo se ALMACENA (no se expone su descarga; la vista de admin llega en Plan 05). El storage local vive fuera de git (`api/var/storage/`).
- **Reset de contraseña:** el endpoint de solicitud SIEMPRE responde 200 (no filtra si el correo existe). Tokens de un solo uso, con expiración (1 hora). Al confirmar se marca `used=true`.
- **Sesión de servidor** con cookie `idsid` (Plan 01-02). Los endpoints de INE requieren `StudentGuard`.
- **Fuera de este plan:** OCR de INE (v2), vista/descarga de INE para admins (Plan 05), integración real de Resend/R2 con credenciales (paso de deploy/hardening, Plan 10).
- **Commits:** uno por tarea mínimo, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: `StorageService` + adaptador local

**Files:**
- Create: `api/src/storage/storage.service.ts`
- Create: `api/src/storage/local-disk.storage.ts`
- Create: `api/src/storage/storage.module.ts`
- Create: `api/src/storage/local-disk.storage.spec.ts`
- Modify: `.gitignore`
- Modify: `api/.env.example`

**Interfaces:**
- Produces:
  - `abstract class StorageService { abstract put(buffer: Buffer, contentType: string): Promise<string>; abstract getPath(key: string): string; }`
  - `LocalDiskStorage` (implementa `StorageService`): guarda en `process.env.STORAGE_DIR ?? 'var/storage'` (relativo a `api/`), genera key `${randomBytes(12).toString('base64url')}.${ext}` según contentType (`image/png`→png, `image/jpeg`→jpg, otro→bin). Crea el directorio si no existe. `getPath(key)` devuelve la ruta absoluta del archivo.
  - `StorageModule` provee `StorageService` con `useClass: LocalDiskStorage`, y lo exporta.

- [ ] **Step 1: Ignorar el storage local y declarar env**

En `.gitignore` (raíz) añade una línea: `api/var/`
En `api/.env.example` añade:
```
STORAGE_DRIVER=local
STORAGE_DIR=var/storage
```

- [ ] **Step 2: Escribir el test fallido**

`api/src/storage/local-disk.storage.spec.ts`:
```ts
import { existsSync, readFileSync, rmSync } from 'fs';
import { LocalDiskStorage } from './local-disk.storage';

describe('LocalDiskStorage', () => {
  const dir = 'var/storage-test';
  const storage = new LocalDiskStorage(dir);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('put guarda el archivo y devuelve una key con extensión por contentType', async () => {
    const key = await storage.put(Buffer.from('hola'), 'image/png');
    expect(key).toMatch(/\.png$/);
    const path = storage.getPath(key);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path).toString()).toBe('hola');
  });

  it('usa jpg para image/jpeg y bin para desconocido', async () => {
    expect(await storage.put(Buffer.from('a'), 'image/jpeg')).toMatch(/\.jpg$/);
    expect(await storage.put(Buffer.from('a'), 'application/x-foo')).toMatch(/\.bin$/);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npx jest local-disk.storage`
Expected: FAIL (módulo no existe).

- [ ] **Step 4: Implementar la abstracción y el adaptador**

`api/src/storage/storage.service.ts`:
```ts
export abstract class StorageService {
  abstract put(buffer: Buffer, contentType: string): Promise<string>;
  abstract getPath(key: string): string;
}
```

`api/src/storage/local-disk.storage.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { isAbsolute, join } from 'path';
import { StorageService } from './storage.service';

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' };

@Injectable()
export class LocalDiskStorage extends StorageService {
  private readonly dir: string;
  constructor(dir = process.env.STORAGE_DIR ?? 'var/storage') {
    super();
    this.dir = isAbsolute(dir) ? dir : join(process.cwd(), dir);
    mkdirSync(this.dir, { recursive: true });
  }
  put(buffer: Buffer, contentType: string): Promise<string> {
    const ext = EXT[contentType] ?? 'bin';
    const key = `${randomBytes(12).toString('base64url')}.${ext}`;
    writeFileSync(this.getPath(key), buffer);
    return Promise.resolve(key);
  }
  getPath(key: string): string {
    return join(this.dir, key);
  }
}
```

`api/src/storage/storage.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalDiskStorage } from './local-disk.storage';

@Global()
@Module({
  providers: [{ provide: StorageService, useClass: LocalDiskStorage }],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `cd api && npx jest local-disk.storage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/storage .gitignore api/.env.example
git commit -m "feat(api): add StorageService with local disk adapter"
```

---

### Task 2: Subida de INE `POST /students/me/ine`

**Files:**
- Modify: `api/src/students/students.service.ts`
- Modify: `api/src/students/students.controller.ts`
- Modify: `api/src/students/students.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/students-ine.e2e-spec.ts`

**Interfaces:**
- Consumes: `StudentGuard`, `@CurrentStudent`, `StorageService`, `PrismaService`.
- Produces:
  - `StudentsService.saveIne(studentId, frente: Buffer, frenteType: string, reverso: Buffer, reversoType: string): Promise<{ ok: true }>` — sube ambos a `StorageService`, guarda las keys en `Student.ineFrente`/`ineReverso`.
  - `POST /students/me/ine` (StudentGuard, multipart: campos `ineFrente` y `ineReverso`, 1 archivo cada uno) → `{ ok: true }`. Rechaza (400) si falta un archivo o el mimetype no es `image/png`/`image/jpeg`, o si supera 5 MB.

- [ ] **Step 1: Instalar tipos de multer**

Run: `cd api && npm install -D @types/multer`
(el runtime multer ya viene con `@nestjs/platform-express`.)

- [ ] **Step 2: Escribir el test e2e fallido**

`api/test/students-ine.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex'); // firma PNG mínima

function payload() {
  const n = Date.now();
  return {
    nombreCompleto: 'Ine', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
    escolaridad: 'Uni', correo: `ine${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
    codigoPostal: '91000', numExt: '1', password: 'secreto123',
  };
}

describe('Students INE', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let cookie: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const p = payload();
    const reg = await request(app.getHttpServer()).post('/students/register').send(p);
    ids.push(reg.body.id);
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo: p.correo, password: 'secreto123', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('sube frente y reverso -> 200 y guarda keys', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', cookie)
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const s = await prisma.student.findUnique({ where: { id: ids[0] } });
    expect(s?.ineFrente).toBeTruthy();
    expect(s?.ineReverso).toBeTruthy();
  });

  it('falta un archivo -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', cookie)
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('mimetype inválido -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', cookie)
      .attach('ineFrente', Buffer.from('x'), { filename: 'f.txt', contentType: 'text/plain' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine')
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- students-ine`
Expected: FAIL (ruta no existe).

- [ ] **Step 4: Añadir `saveIne` al servicio**

En `api/src/students/students.service.ts`, inyecta `StorageService` en el constructor (`private storage: StorageService`, importándolo de `../storage/storage.service`) y añade:
```ts
async saveIne(studentId: string, frente: Buffer, frenteType: string, reverso: Buffer, reversoType: string) {
  const ineFrente = await this.storage.put(frente, frenteType);
  const ineReverso = await this.storage.put(reverso, reversoType);
  await this.prisma.student.update({ where: { id: studentId }, data: { ineFrente, ineReverso } });
  return { ok: true as const };
}
```

- [ ] **Step 5: Añadir el endpoint multipart al controller**

En `api/src/students/students.controller.ts` añade los imports y el endpoint:
```ts
import { BadRequestException, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

const ALLOWED = ['image/png', 'image/jpeg'];
const MAX = 5 * 1024 * 1024;

@UseGuards(StudentGuard)
@Post('me/ine')
@UseInterceptors(FileFieldsInterceptor(
  [{ name: 'ineFrente', maxCount: 1 }, { name: 'ineReverso', maxCount: 1 }],
  { limits: { fileSize: MAX } },
))
async uploadIne(
  @CurrentStudent() student: any,
  @UploadedFiles() files: { ineFrente?: Express.Multer.File[]; ineReverso?: Express.Multer.File[] },
) {
  const frente = files?.ineFrente?.[0];
  const reverso = files?.ineReverso?.[0];
  if (!frente || !reverso) throw new BadRequestException('Se requieren INE frente y reverso');
  if (!ALLOWED.includes(frente.mimetype) || !ALLOWED.includes(reverso.mimetype)) {
    throw new BadRequestException('Formato inválido: solo PNG o JPG');
  }
  return this.students.saveIne(student.id, frente.buffer, frente.mimetype, reverso.buffer, reverso.mimetype);
}
```

- [ ] **Step 6: Registrar StorageModule**

En `api/src/students/students.module.ts` añade `StorageModule` a `imports` (import desde `../storage/storage.module`). En `api/src/app.module.ts`, añade `StorageModule` a `imports` (para que sea global disponible).

- [ ] **Step 7: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- students-ine`
Expected: PASS (4/4).

- [ ] **Step 8: Commit**

```bash
git add api/src/students api/src/app.module.ts api/test/students-ine.e2e-spec.ts api/package.json
git commit -m "feat(api): add INE upload endpoint backed by StorageService"
```

---

### Task 3: Credencial pública `GET /c/:token`

**Files:**
- Create: `api/src/students/edad.ts`
- Create: `api/src/students/edad.spec.ts`
- Modify: `api/src/students/students.service.ts`
- Create: `api/src/students/credential.controller.ts`
- Modify: `api/src/students/students.module.ts`
- Create: `api/test/credential.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces:
  - `edadFrom(fechaNacimiento: Date, now?: Date): number` — edad en años cumplidos.
  - `StudentsService.getCredentialByToken(token): Promise<CredentialView>` — `NotFoundException` (404) si el token no existe.
  - `CredentialView = { nombreCompleto, nivel, edad, escolaridad, colonia, intereses: string[], redes: { facebook, instagram, tiktok, whatsapp } }`. NO incluye correo, curp, telefono, domicilio completo, INE ni passwordHash.
  - `GET /c/:token` (público) → `CredentialView`.

- [ ] **Step 1: Escribir el test del helper de edad (fallido)**

`api/src/students/edad.spec.ts`:
```ts
import { edadFrom } from './edad';

describe('edadFrom', () => {
  it('calcula años cumplidos', () => {
    const now = new Date('2026-07-21');
    expect(edadFrom(new Date('2005-07-21'), now)).toBe(21);
    expect(edadFrom(new Date('2005-07-22'), now)).toBe(20); // aún no cumple
    expect(edadFrom(new Date('2000-01-01'), now)).toBe(26);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd api && npx jest edad`
Expected: FAIL.

- [ ] **Step 3: Implementar el helper**

`api/src/students/edad.ts`:
```ts
export function edadFrom(fechaNacimiento: Date, now: Date = new Date()): number {
  let edad = now.getFullYear() - fechaNacimiento.getFullYear();
  const m = now.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < fechaNacimiento.getDate())) edad--;
  return edad;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd api && npx jest edad`
Expected: PASS.

- [ ] **Step 5: Escribir el test e2e de credencial (fallido)**

`api/test/credential.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Credential', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let token: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Cred Uno', fechaNacimiento: '2005-05-05', curp: `CURP${n}`, sexo: 'M',
      escolaridad: 'Prepa', correo: `cred${n}@t.com`, telefono: '555', calle: 'c', colonia: 'Centro',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
    token = reg.body.credentialToken;
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('GET /c/:token devuelve solo campos seguros', async () => {
    const res = await request(app.getHttpServer()).get(`/c/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.nombreCompleto).toBe('Cred Uno');
    expect(res.body.nivel).toBe('bronce');
    expect(typeof res.body.edad).toBe('number');
    expect(res.body.colonia).toBe('Centro');
    expect(Array.isArray(res.body.intereses)).toBe(true);
    expect(res.body.redes).toBeDefined();
    // NO debe filtrar datos sensibles
    expect(res.body.correo).toBeUndefined();
    expect(res.body.curp).toBeUndefined();
    expect(res.body.telefono).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.ineFrente).toBeUndefined();
  });

  it('token inexistente -> 404', async () => {
    const res = await request(app.getHttpServer()).get('/c/no-existe-token');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- credential`
Expected: FAIL (ruta no existe).

- [ ] **Step 7: Implementar `getCredentialByToken` y el controller**

En `api/src/students/students.service.ts` añade el import `import { NotFoundException } from '@nestjs/common';` (junto a los existentes) y `import { edadFrom } from './edad';`, y el método:
```ts
async getCredentialByToken(token: string) {
  const s = await this.prisma.student.findUnique({
    where: { credentialToken: token },
    include: { interests: { include: { interest: { select: { nombre: true } } } } },
  });
  if (!s) throw new NotFoundException();
  return {
    nombreCompleto: s.nombreCompleto,
    nivel: s.nivel,
    edad: edadFrom(s.fechaNacimiento),
    escolaridad: s.escolaridad,
    colonia: s.colonia,
    intereses: s.interests.map((si) => si.interest.nombre),
    redes: { facebook: s.facebook, instagram: s.instagram, tiktok: s.tiktok, whatsapp: s.whatsapp },
  };
}
```

`api/src/students/credential.controller.ts`:
```ts
import { Controller, Get, Param } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('c')
export class CredentialController {
  constructor(private students: StudentsService) {}
  @Get(':token')
  get(@Param('token') token: string) {
    return this.students.getCredentialByToken(token);
  }
}
```

En `api/src/students/students.module.ts` añade `CredentialController` a `controllers`.

- [ ] **Step 8: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- credential`
Expected: PASS (2/2).

- [ ] **Step 9: Commit**

```bash
git add api/src/students api/test/credential.e2e-spec.ts
git commit -m "feat(api): add public credential endpoint by token (safe fields only)"
```

---

### Task 4: Frontend — página pública de credencial `/c/[token]`

**Files:**
- Create: `web/src/app/c/[token]/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET /c/{token}`.
- Produces: página pública `/c/{token}` que muestra la credencial (nombre, nivel, edad, escolaridad, colonia, intereses, redes); si 404 muestra "Credencial no encontrada".

- [ ] **Step 1: Revisar la guía de Next antes de escribir**

Existe `web/AGENTS.md` (Next.js 16 difiere del conocimiento previo). Confirma en `web/node_modules/next/dist/docs/` cómo se leen params de ruta dinámica en client components (patrón usado en Plan 02: componentes `'use client'` que leen datos vía `useEffect`+`api()`). Sigue el patrón existente de `web/src/app/(estudiante)/perfil/page.tsx`.

- [ ] **Step 2: Crear la página**

`web/src/app/c/[token]/page.tsx`:
```tsx
'use client';
import { use, useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Credential = {
  nombreCompleto: string; nivel: string; edad: number; escolaridad: string; colonia: string;
  intereses: string[]; redes: { facebook?: string; instagram?: string; tiktok?: string; whatsapp?: string };
};

export default function CredencialPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [cred, setCred] = useState<Credential | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api(`/c/${token}`).then(async (r) => {
      if (r.ok) setCred(await r.json());
      else setNotFound(true);
    }).catch(() => setNotFound(true));
  }, [token]);

  if (notFound) return <main className="p-6">Credencial no encontrada.</main>;
  if (!cred) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto mt-10 max-w-sm p-6">
      <div className="rounded-2xl border p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">Credencial digital</p>
        <h1 className="mt-1 text-2xl font-semibold">{cred.nombreCompleto}</h1>
        <p className="mt-1 text-sm">Nivel <b>{cred.nivel}</b> · {cred.edad} años</p>
        <dl className="mt-4 space-y-1 text-sm">
          <div><dt className="inline text-gray-500">Escolaridad: </dt><dd className="inline">{cred.escolaridad}</dd></div>
          <div><dt className="inline text-gray-500">Colonia: </dt><dd className="inline">{cred.colonia}</dd></div>
        </dl>
        {cred.intereses.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cred.intereses.map((i) => (
              <span key={i} className="rounded-full border px-3 py-1 text-xs">{i}</span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y render**

Run: con la API arriba y un estudiante registrado (obtén su `credentialToken`), `cd web && npm run build` (compila) y `npm run dev` en background; `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/c/CUALQUIER_TOKEN` → 200 (la página renderiza aunque el token no exista, mostrando "no encontrada"). Detén el server.
Expected: build OK, ruta 200.

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add public credential page"
```

---

### Task 5: `EmailService` + adaptador de desarrollo

**Files:**
- Create: `api/src/email/email.service.ts`
- Create: `api/src/email/dev-email.service.ts`
- Create: `api/src/email/email.module.ts`
- Create: `api/src/email/dev-email.service.spec.ts`
- Modify: `api/.env.example`

**Interfaces:**
- Produces:
  - `abstract class EmailService { abstract send(to: string, subject: string, body: string): Promise<void>; }`
  - `DevEmailService` (implementa `EmailService`): escribe el correo a `console.log` (`[email] to=<to> subject=<subject>`). No lanza.
  - `EmailModule` provee `EmailService` con `useClass: DevEmailService`, y lo exporta.

- [ ] **Step 1: Declarar env**

En `api/.env.example` añade:
```
EMAIL_DRIVER=dev
WEB_URL=http://localhost:3000
```

- [ ] **Step 2: Escribir el test fallido**

`api/src/email/dev-email.service.spec.ts`:
```ts
import { DevEmailService } from './dev-email.service';

describe('DevEmailService', () => {
  it('send loggea y resuelve sin lanzar', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const svc = new DevEmailService();
    await expect(svc.send('a@t.com', 'Asunto', 'cuerpo')).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npx jest dev-email`
Expected: FAIL.

- [ ] **Step 4: Implementar**

`api/src/email/email.service.ts`:
```ts
export abstract class EmailService {
  abstract send(to: string, subject: string, body: string): Promise<void>;
}
```

`api/src/email/dev-email.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';

@Injectable()
export class DevEmailService extends EmailService {
  send(to: string, subject: string, body: string): Promise<void> {
    console.log(`[email] to=${to} subject=${subject}\n${body}`);
    return Promise.resolve();
  }
}
```

`api/src/email/email.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { DevEmailService } from './dev-email.service';

@Global()
@Module({
  providers: [{ provide: EmailService, useClass: DevEmailService }],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `cd api && npx jest dev-email`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/email api/.env.example
git commit -m "feat(api): add EmailService with dev console adapter"
```

---

### Task 6: Modelo `PasswordReset` + solicitud de reset

**Files:**
- Modify: `api/prisma/schema.prisma`
- Modify: `api/src/students/students.service.ts`
- Modify: `api/src/students/students.controller.ts`
- Modify: `api/src/students/students.module.ts`
- Create: `api/src/students/dto/reset-request.dto.ts`
- Create: `api/test/password-reset-request.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `EmailService`.
- Produces:
  - `PasswordReset { id, student(relation), studentId, token @unique, expiresAt, used @default(false), createdAt }`.
  - `ResetRequestDto { correo: string }`.
  - `StudentsService.requestReset(correo): Promise<void>` — si existe el estudiante, crea un `PasswordReset` (`token = randomBytes(24).base64url`, expira en 1h) y envía email con enlace `${process.env.WEB_URL}/recuperar/{token}`. Si NO existe, no hace nada. Nunca lanza por correo inexistente.
  - `POST /students/password-reset/request` → SIEMPRE 200 `{ ok: true }`.

- [ ] **Step 1: Añadir el modelo y migrar**

En `api/prisma/schema.prisma`, añade a `Student` la relación inversa `passwordResets PasswordReset[]` y el modelo:
```prisma
model PasswordReset {
  id        String   @id @default(cuid())
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId String
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```
Run: `cd api && npx prisma migrate dev --name password_reset`

- [ ] **Step 2: Escribir el DTO**

`api/src/students/dto/reset-request.dto.ts`:
```ts
import { IsEmail } from 'class-validator';
export class ResetRequestDto {
  @IsEmail() correo: string;
}
```

- [ ] **Step 3: Escribir el test e2e fallido**

`api/test/password-reset-request.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Password reset request', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let correo: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const n = Date.now(); correo = `reset${n}@t.com`;
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'R', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.passwordReset.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('correo existente -> 200 y crea un PasswordReset', async () => {
    const res = await request(app.getHttpServer()).post('/students/password-reset/request').send({ correo });
    expect(res.status).toBe(201);
    const count = await prisma.passwordReset.count({ where: { studentId: ids[0] } });
    expect(count).toBe(1);
  });

  it('correo inexistente -> 200 y NO crea nada (no filtra)', async () => {
    const res = await request(app.getHttpServer()).post('/students/password-reset/request')
      .send({ correo: 'nadie@t.com' });
    expect(res.status).toBe(201);
    const count = await prisma.passwordReset.count({ where: { student: { correo: 'nadie@t.com' } } });
    expect(count).toBe(0);
  });
});
```
(NestJS responde 201 por defecto a POST; por eso el test espera 201.)

- [ ] **Step 4: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- password-reset-request`
Expected: FAIL (ruta no existe).

- [ ] **Step 5: Implementar `requestReset` y el endpoint**

En `api/src/students/students.service.ts`, inyecta `EmailService` (`private email: EmailService`, import desde `../email/email.service`), importa `randomBytes` de `crypto` si no está, y añade:
```ts
async requestReset(correo: string): Promise<void> {
  const student = await this.prisma.student.findUnique({ where: { correo } });
  if (!student) return;
  const token = randomBytes(24).toString('base64url');
  await this.prisma.passwordReset.create({
    data: { studentId: student.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const link = `${process.env.WEB_URL ?? 'http://localhost:3000'}/recuperar/${token}`;
  await this.email.send(correo, 'Recupera tu contraseña', `Abre este enlace para restablecerla: ${link}`);
}
```

En `api/src/students/students.controller.ts` añade:
```ts
// import { ResetRequestDto } from './dto/reset-request.dto';
@Post('password-reset/request')
async requestReset(@Body() dto: ResetRequestDto) {
  await this.students.requestReset(dto.correo);
  return { ok: true };
}
```

En `api/src/students/students.module.ts`, asegúrate de que `EmailModule` esté disponible: como `EmailModule` es `@Global()` (Task 5), basta con que esté importado en `AppModule` — añade `EmailModule` a `imports` de `api/src/app.module.ts`.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- password-reset-request`
Expected: PASS (2/2).

- [ ] **Step 7: Commit**

```bash
git add api/prisma api/src/students api/src/app.module.ts api/test/password-reset-request.e2e-spec.ts
git commit -m "feat(api): add password reset request (no email enumeration)"
```

---

### Task 7: Confirmación de reset `POST /students/password-reset/confirm`

**Files:**
- Modify: `api/src/students/students.service.ts`
- Modify: `api/src/students/students.controller.ts`
- Create: `api/src/students/dto/reset-confirm.dto.ts`
- Create: `api/test/password-reset-confirm.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `PasswordService`.
- Produces:
  - `ResetConfirmDto { token: string; password: string (min 8) }`.
  - `StudentsService.confirmReset(token, password): Promise<void>` — `BadRequestException` (400) si el token no existe, ya fue usado, o expiró. En éxito: actualiza `passwordHash` del estudiante y marca `used=true`.
  - `POST /students/password-reset/confirm` → 200/201 `{ ok: true }` o 400.

- [ ] **Step 1: Escribir el DTO**

`api/src/students/dto/reset-confirm.dto.ts`:
```ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
export class ResetConfirmDto {
  @IsString() @IsNotEmpty() token: string;
  @IsString() @MinLength(8) password: string;
}
```

- [ ] **Step 2: Escribir el test e2e fallido (flujo completo)**

`api/test/password-reset-confirm.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Password reset confirm', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let correo: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const n = Date.now(); correo = `rc${n}@t.com`;
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'RC', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'viejo1234',
    });
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.passwordReset.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  async function freshToken() {
    await request(app.getHttpServer()).post('/students/password-reset/request').send({ correo });
    const pr = await prisma.passwordReset.findFirst({
      where: { studentId: ids[0], used: false }, orderBy: { createdAt: 'desc' },
    });
    return pr!.token;
  }

  it('confirma con token válido y permite login con la nueva contraseña', async () => {
    const token = await freshToken();
    const res = await request(app.getHttpServer()).post('/students/password-reset/confirm')
      .send({ token, password: 'nuevo12345' });
    expect(res.status).toBe(201);
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'nuevo12345', remember: false });
    expect(login.status).toBe(201);
  });

  it('reutilizar el token -> 400', async () => {
    const token = await freshToken();
    await request(app.getHttpServer()).post('/students/password-reset/confirm').send({ token, password: 'otra12345' });
    const again = await request(app.getHttpServer()).post('/students/password-reset/confirm').send({ token, password: 'otra12345' });
    expect(again.status).toBe(400);
  });

  it('token inexistente -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/students/password-reset/confirm')
      .send({ token: 'no-existe', password: 'otra12345' });
    expect(res.status).toBe(400);
  });

  it('token expirado -> 400', async () => {
    const token = await freshToken();
    await prisma.passwordReset.updateMany({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app.getHttpServer()).post('/students/password-reset/confirm')
      .send({ token, password: 'otra12345' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- password-reset-confirm`
Expected: FAIL (ruta no existe).

- [ ] **Step 4: Implementar `confirmReset` y el endpoint**

En `api/src/students/students.service.ts` añade:
```ts
async confirmReset(token: string, password: string): Promise<void> {
  const pr = await this.prisma.passwordReset.findUnique({ where: { token } });
  if (!pr || pr.used || pr.expiresAt.getTime() < Date.now()) {
    throw new BadRequestException('Token inválido o expirado');
  }
  const passwordHash = await this.passwords.hash(password);
  await this.prisma.$transaction([
    this.prisma.student.update({ where: { id: pr.studentId }, data: { passwordHash } }),
    this.prisma.passwordReset.update({ where: { id: pr.id }, data: { used: true } }),
  ]);
}
```
Asegura el import `BadRequestException` de `@nestjs/common` (añádelo a los imports existentes).

En `api/src/students/students.controller.ts` añade:
```ts
// import { ResetConfirmDto } from './dto/reset-confirm.dto';
@Post('password-reset/confirm')
async confirmReset(@Body() dto: ResetConfirmDto) {
  await this.students.confirmReset(dto.token, dto.password);
  return { ok: true };
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `cd api && npm run test:e2e -- password-reset-confirm`
Expected: PASS (4/4).

- [ ] **Step 6: Correr toda la suite (sin regresiones)**

Run: `cd api && npm test && npm run test:e2e`
Expected: unit y e2e verdes (incluye storage, email, edad, ine, credential, reset request/confirm además de lo anterior).

- [ ] **Step 7: Commit**

```bash
git add api/src/students api/test/password-reset-confirm.e2e-spec.ts
git commit -m "feat(api): add password reset confirm (single-use, expiring tokens)"
```

---

### Task 8: Frontend — solicitar y confirmar reset de contraseña

**Files:**
- Create: `web/src/app/(estudiante)/recuperar/page.tsx`
- Create: `web/src/app/(estudiante)/recuperar/[token]/page.tsx`

**Interfaces:**
- Consumes: `api()`, `POST /students/password-reset/request`, `POST /students/password-reset/confirm`.
- Produces:
  - `/recuperar` — pide correo; en submit hace request y SIEMPRE muestra el mismo mensaje ("Si el correo existe, te enviamos un enlace"), sin revelar existencia.
  - `/recuperar/[token]` — pide nueva contraseña; en éxito redirige a `/ingresar`; en error (400) muestra "El enlace no es válido o expiró".

- [ ] **Step 1: Crear la página de solicitud**

`web/src/app/(estudiante)/recuperar/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { api } from '../../../lib/api';

export default function RecuperarPage() {
  const [correo, setCorreo] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/students/password-reset/request', { method: 'POST', body: JSON.stringify({ correo }) });
    } catch { /* no revelar errores */ }
    setSent(true);
  }

  if (sent) {
    return <main className="mx-auto mt-24 max-w-sm p-6">Si el correo existe, te enviamos un enlace para restablecer tu contraseña.</main>;
  }
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Recuperar contraseña</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Tu correo" type="email"
          value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Enviar enlace</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Crear la página de confirmación**

`web/src/app/(estudiante)/recuperar/[token]/page.tsx`:
```tsx
'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

export default function ConfirmarResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/students/password-reset/confirm', {
        method: 'POST', body: JSON.stringify({ token, password }),
      });
      if (res.ok) router.push('/ingresar');
      else setError('El enlace no es válido o expiró.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Nueva contraseña</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Nueva contraseña (mín. 8)" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Guardar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y rutas**

Run: `cd web && npm run build`; luego `npm run dev` en background y `curl -s -o /dev/null -w "%{http_code}"` a `http://localhost:3000/recuperar` y `.../recuperar/algun-token` → 200 ambos. Detén el server.
Expected: build OK, ambas rutas 200.

- [ ] **Step 4: Verificación E2E manual del flujo de reset**

Con API (`npm run start:dev`) y web arriba: registra un estudiante, ve a `/recuperar`, envía tu correo; en la consola de la API aparece el `[email] ... /recuperar/<token>`; abre esa URL, pon una contraseña nueva, confirma que redirige a `/ingresar`, y entra con la nueva contraseña.
Expected: el flujo completo funciona; el token se marca usado (reintentar da error).

- [ ] **Step 5: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add password reset request and confirm pages"
```

---

## Self-Review

**Spec coverage (Plan 03 vs spec §3.1 / §7):**
- Credencial digital `/c/{token}` con fix de seguridad (token no adivinable, no CURP; solo campos seguros): Tasks 3, 4. ✅
- INE frente/reverso subida (sin OCR), almacenamiento restringido (no expuesto públicamente): Tasks 1, 2. ✅
- Recuperación de contraseña por email (Resend-ready vía abstracción): Tasks 5, 6, 7, 8. ✅
- Cumplimiento §7: INE no expuesto; credencial sin datos sensibles; tokens seguros; no enumeración de correos. ✅

**Placeholder scan:** sin TBD/TODO; todo el código completo e inline.

**Type consistency:** `StorageService.put(buffer, contentType) → key` usado igual en Task 1 (adaptador) y Task 2 (saveIne). `EmailService.send(to, subject, body)` igual en Task 5 y Task 6. `credentialToken` (Plan 02) consumido por `getCredentialByToken`. `PasswordReset` (token/used/expiresAt) consistente entre Tasks 6 y 7. `edadFrom(Date, now?)` definido en Task 3 y usado en `getCredentialByToken`. DTOs con class-validator conforme al `ValidationPipe` global.

**Nota de despliegue (backlog):** en producción, sustituir `LocalDiskStorage`→adaptador R2 (S3) y `DevEmailService`→adaptador Resend, seleccionados por `STORAGE_DRIVER`/`EMAIL_DRIVER`. La vista/descarga de INE para admins llega en Plan 05. CORS allowlist sigue pendiente (backlog general).

## Próximos planes
- **04** — Comercios/beneficios (login comercio + escaneo QR credencial + registro de uso).
- **05** — Panel admin/gestor + catálogos CRUD (incl. vista de INE de estudiantes) + dashboard.
- **06** — Puntos/niveles + eventos + QR check-in. **07** — PWA.
