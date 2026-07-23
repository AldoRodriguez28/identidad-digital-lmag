# Plan 07 — Puntos/niveles + Eventos + QR check-in (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el staff (admin/gestor) escanee el QR de la credencial de un joven en un evento y le otorgue puntos, que los puntos recalculen el nivel del joven, y que el joven vea su nivel, progreso e historial de movimientos y el catálogo público de eventos.

**Architecture:** Un módulo nuevo `points` con un `PointsService` reutilizable y **transaccional** (inserta un `PointsMovement`, suma puntos y recalcula `nivel` con el helper existente `nivelForPuntos`). Un módulo nuevo `events` con CRUD de eventos para admin/gestor (`/admin/events`), catálogo público (`GET /events`) y el endpoint de check-in (`POST /admin/events/:id/checkin`) que compone `PointsService` dentro de una transacción Prisma. El endpoint del joven `GET /students/me/points` consume `PointsService`. En el frontend: páginas de estudiante `/mis-puntos` y `/eventos`, y páginas de panel `/panel/eventos` (CRUD) y `/panel/eventos/checkin` (escáner de cámara, reutiliza el patrón `html5-qrcode` del módulo comercio).

**Tech Stack:** NestJS, Prisma 6.19.3, class-validator, Next.js 16 App Router, `html5-qrcode` (ya instalado). Node 20.

## Global Constraints

- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx. Existe `api/.nvmrc`.
- **ORM Prisma 6.19.3** (NO 7). Postgres en `localhost:5432`, db `identidad_dev` (Docker: `docker compose up -d`). Migraciones con `npx prisma migrate dev --name <nombre>` y regenerar cliente.
- **Umbrales de nivel (verbatim del spec §3.1):** Bronce 0–500, Plata 501–1500, Oro 1501–3000, Diamante 3000+. Ya implementados en `api/src/students/nivel.ts` (`nivelForPuntos`). **NO redefinir los umbrales**, reutilizar el helper.
- **El nivel SIEMPRE se deriva de `puntosAcumulados`** vía `nivelForPuntos`; nunca se setea a mano. Cada otorgamiento inserta un `PointsMovement` y recalcula el nivel **en la misma transacción**.
- **Check-in único por (evento, estudiante):** constraint `@@unique([eventId, studentId])`; segundo check-in del mismo joven al mismo evento → `409 ConflictException`. La creación del check-in y el otorgamiento de puntos son **atómicos** (`prisma.$transaction`).
- **Autorización:** `@UseGuards(SessionGuard, RolesGuard)` + `@Roles('admin','gestor')` en `/admin/events*` y el check-in. `GET /students/me/points` usa `StudentGuard`. `GET /events` es **público de solo lectura** (solo eventos `activo:true`), igual que `GET /benefits` del Plan 04.
- **Validación** con class-validator (`ValidationPipe` global: `whitelist:true, forbidNonWhitelisted:true, transform:true`). Fechas ISO con `@IsDateString()`. `puntosOtorgados` `@IsInt() @Min(0)`.
- **El uso de beneficio en comercio NO otorga puntos** (v1, ya vigente del Plan 04). Solo el check-in de evento otorga puntos.
- **Sesión de servidor** polimórfica (`internal_user | student | commerce`), cookie `idsid`. `SessionGuard` carga el `InternalUser` en `req.user` (con `id`, `rol`); `StudentGuard` carga el `Student` en `req.student`.
- **Suite e2e serializada:** `api/test/jest-e2e.json` ya tiene `maxWorkers:1` (no lo cambies).
- **Fuera de este plan:** propuesta de eventos por el estudiante (v2); ajustes manuales de puntos por admin (backlog, aunque el modelo `PointsMovement.tipo='ajuste'` queda listo); cursos/talleres y bolsa de trabajo (Plan 08); PWA (Plan 09).
- **Commits:** uno por tarea mínimo, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `api/prisma/schema.prisma` — añade enums `EventoCategoria`, `TipoMovimiento`; modelos `Event`, `EventCheckin`, `PointsMovement`; relaciones inversas en `Student`.
- `api/src/students/nivel.ts` — añade helper puro `progresoNivel(puntos)` (nivel + siguiente + puntos faltantes + %).
- `api/src/points/` — `points.service.ts` (award transaccional + getSummary), `points.module.ts`. Módulo exportado, consumido por `events` y `students`.
- `api/src/events/` — `events.service.ts` (CRUD + catálogo público + check-in), `events-admin.controller.ts` (`/admin/events*`), `events.controller.ts` (`GET /events`), `dto/event.dto.ts`, `events.module.ts`.
- `api/src/students/students.controller.ts` + `students.module.ts` — endpoint `GET /students/me/points` consumiendo `PointsService`.
- `web/src/app/(estudiante)/mis-puntos/page.tsx`, `web/src/app/(estudiante)/eventos/page.tsx` — vistas del joven.
- `web/src/app/(admin)/panel/eventos/page.tsx`, `web/src/app/(admin)/panel/eventos/checkin/page.tsx` — panel + escáner.
- `web/src/app/(admin)/panel/layout.tsx` — enlace **Eventos** en el nav.

---

### Task 1: Schema + `PointsService` (otorgar puntos + resumen)

**Files:**
- Modify: `api/prisma/schema.prisma`
- Modify: `api/src/students/nivel.ts`
- Create: `api/src/students/nivel-progreso.spec.ts`
- Create: `api/src/points/points.service.ts`
- Create: `api/src/points/points.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/points-service.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `nivelForPuntos` (`../students/nivel`).
- Produces:
  - Prisma: `Event { id, titulo, descripcion, categoria(EventoCategoria), fecha(DateTime), lugar, puntosOtorgados(Int), activo(Boolean=true), createdAt, checkins }`; `EventCheckin { id, eventId, studentId, otorgadoPor(String), createdAt, @@unique([eventId,studentId]) }`; `PointsMovement { id, studentId, tipo(TipoMovimiento), referencia(String?), puntos(Int), createdAt }`. Enums `EventoCategoria { deportivo, cultural, taller }`, `TipoMovimiento { evento, ajuste }`.
  - `progresoNivel(puntos: number)` → `{ nivel: Nivel; siguiente: Nivel | null; puntosParaSiguiente: number; porcentaje: number }`.
  - `PointsService.award(tx, studentId, tipo, referencia, puntos)` — recibe un **cliente de transacción Prisma** `tx`; inserta `PointsMovement`, suma puntos, recalcula `nivel`; devuelve el `Student` actualizado. Composable dentro de `prisma.$transaction`.
  - `PointsService.getSummary(studentId)` → `{ puntosAcumulados, nivel, siguiente, puntosParaSiguiente, porcentaje, eventosAsistidos, movimientos: {id, tipo, referencia, puntos, createdAt}[] }`.

- [ ] **Step 1: Añadir enums, modelos y relaciones al schema**

En `api/prisma/schema.prisma`, tras el enum `Nivel`, añade:
```prisma
enum EventoCategoria {
  deportivo
  cultural
  taller
}

enum TipoMovimiento {
  evento
  ajuste
}
```

Al final del archivo añade:
```prisma
model Event {
  id              String          @id @default(cuid())
  titulo          String
  descripcion     String
  categoria       EventoCategoria
  fecha           DateTime
  lugar           String
  puntosOtorgados Int
  activo          Boolean         @default(true)
  createdAt       DateTime        @default(now())
  checkins        EventCheckin[]
}

model EventCheckin {
  id          String   @id @default(cuid())
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  eventId     String
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId   String
  otorgadoPor String
  createdAt   DateTime @default(now())

  @@unique([eventId, studentId])
}

model PointsMovement {
  id         String         @id @default(cuid())
  student    Student        @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId  String
  tipo       TipoMovimiento
  referencia String?
  puntos     Int
  createdAt  DateTime       @default(now())
}
```

En el modelo `Student`, añade al final de la lista de relaciones (junto a `benefitUsages`):
```prisma
  checkins        EventCheckin[]
  pointsMovements PointsMovement[]
```

- [ ] **Step 2: Migrar y regenerar el cliente**

Run: `cd api && nvm use 20.19.1 && npx prisma migrate dev --name events_points && npx prisma generate`
Expected: migración aplicada, cliente regenerado sin error.

- [ ] **Step 3: Escribir el test unitario de `progresoNivel` (falla)**

`api/src/students/nivel-progreso.spec.ts`:
```ts
import { progresoNivel } from './nivel';

describe('progresoNivel', () => {
  it('bronce: 0 pts → 0% hacia plata (501)', () => {
    const p = progresoNivel(0);
    expect(p.nivel).toBe('bronce');
    expect(p.siguiente).toBe('plata');
    expect(p.puntosParaSiguiente).toBe(501);
    expect(p.porcentaje).toBe(0);
  });

  it('plata: 1000 pts → ~50% hacia oro (1501)', () => {
    const p = progresoNivel(1000);
    expect(p.nivel).toBe('plata');
    expect(p.siguiente).toBe('oro');
    expect(p.puntosParaSiguiente).toBe(501);
    expect(p.porcentaje).toBe(50);
  });

  it('diamante: sin siguiente nivel, 100%', () => {
    const p = progresoNivel(5000);
    expect(p.nivel).toBe('diamante');
    expect(p.siguiente).toBeNull();
    expect(p.puntosParaSiguiente).toBe(0);
    expect(p.porcentaje).toBe(100);
  });
});
```

- [ ] **Step 4: Ejecutar y verificar que falla**

Run: `cd api && npm test -- nivel-progreso`
Expected: FAIL (`progresoNivel` no existe).

- [ ] **Step 5: Implementar `progresoNivel`**

Añade al final de `api/src/students/nivel.ts`:
```ts
function tramo(puntos: number, piso: number, techo: number, siguiente: Nivel) {
  return {
    nivel: nivelForPuntos(puntos),
    siguiente,
    puntosParaSiguiente: techo - puntos,
    porcentaje: Math.round(((puntos - piso) / (techo - piso)) * 100),
  };
}

export function progresoNivel(puntos: number): {
  nivel: Nivel; siguiente: Nivel | null; puntosParaSiguiente: number; porcentaje: number;
} {
  const nivel = nivelForPuntos(puntos);
  if (nivel === 'bronce') return tramo(puntos, 0, 501, 'plata');
  if (nivel === 'plata') return tramo(puntos, 501, 1501, 'oro');
  if (nivel === 'oro') return tramo(puntos, 1501, 3001, 'diamante');
  return { nivel: 'diamante', siguiente: null, puntosParaSiguiente: 0, porcentaje: 100 };
}
```

- [ ] **Step 6: Verificar que pasa**

Run: `cd api && npm test -- nivel-progreso`
Expected: PASS (3/3).

- [ ] **Step 7: Escribir el test e2e de `PointsService` (falla)**

`api/test/points-service.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';
import { PointsService } from '../src/points/points.service';
import { randomBytes } from 'crypto';

describe('PointsService', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let points: PointsService;
  let studentId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    points = app.get(PointsService);
    const pass = app.get(PasswordService);
    const s = await prisma.student.create({
      data: {
        nombreCompleto: 'Puntos Test', fechaNacimiento: new Date('2005-01-01'), curp: `PT${Date.now()}`,
        sexo: 'M', escolaridad: 'prepa', correo: `pts${Date.now()}@t.com`, telefono: '00',
        calle: 'x', colonia: 'y', codigoPostal: '00000', numExt: '1',
        credentialToken: randomBytes(16).toString('base64url'), passwordHash: await pass.hash('x12345678'),
      },
    });
    studentId = s.id;
  });
  afterAll(async () => {
    await prisma.pointsMovement.deleteMany({ where: { studentId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await app.close();
  });

  it('award suma puntos, inserta movimiento y recalcula nivel dentro de una transacción', async () => {
    const updated = await prisma.$transaction((tx) =>
      points.award(tx, studentId, 'evento', 'evt-1', 600),
    );
    expect(updated.puntosAcumulados).toBe(600);
    expect(updated.nivel).toBe('plata'); // 600 > 500 → plata
    const movs = await prisma.pointsMovement.findMany({ where: { studentId } });
    expect(movs).toHaveLength(1);
    expect(movs[0].puntos).toBe(600);
    expect(movs[0].referencia).toBe('evt-1');
  });

  it('getSummary devuelve total, nivel, progreso, eventosAsistidos e historial', async () => {
    const sum = await points.getSummary(studentId);
    expect(sum.puntosAcumulados).toBe(600);
    expect(sum.nivel).toBe('plata');
    expect(sum.siguiente).toBe('oro');
    expect(sum.movimientos.length).toBeGreaterThanOrEqual(1);
    expect(typeof sum.eventosAsistidos).toBe('number');
  });
});
```

- [ ] **Step 8: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- points-service`
Expected: FAIL (`PointsService` / módulo no existe).

- [ ] **Step 9: Implementar `PointsService` y su módulo**

`api/src/points/points.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { Prisma, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { nivelForPuntos, progresoNivel } from '../students/nivel';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  // Otorga puntos DENTRO de una transacción (tx) para componer con otras escrituras (p. ej. el check-in).
  async award(
    tx: Prisma.TransactionClient,
    studentId: string,
    tipo: TipoMovimiento,
    referencia: string | null,
    puntos: number,
  ) {
    const student = await tx.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { puntosAcumulados: true },
    });
    const nuevoTotal = student.puntosAcumulados + puntos;
    await tx.pointsMovement.create({ data: { studentId, tipo, referencia, puntos } });
    return tx.student.update({
      where: { id: studentId },
      data: { puntosAcumulados: nuevoTotal, nivel: nivelForPuntos(nuevoTotal) },
    });
  }

  async getSummary(studentId: string) {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { puntosAcumulados: true, nivel: true },
    });
    const movimientos = await this.prisma.pointsMovement.findMany({
      where: { studentId },
      select: { id: true, tipo: true, referencia: true, puntos: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const eventosAsistidos = await this.prisma.eventCheckin.count({ where: { studentId } });
    const prog = progresoNivel(student.puntosAcumulados);
    return {
      puntosAcumulados: student.puntosAcumulados,
      nivel: student.nivel,
      siguiente: prog.siguiente,
      puntosParaSiguiente: prog.puntosParaSiguiente,
      porcentaje: prog.porcentaje,
      eventosAsistidos,
      movimientos,
    };
  }
}
```

`api/src/points/points.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { PointsService } from './points.service';

@Module({
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
```

En `api/src/app.module.ts`: importa `PointsModule` y añádelo al array `imports` de `@Module`.

- [ ] **Step 10: Verificar que pasa**

Run: `cd api && npm run test:e2e -- points-service`
Expected: PASS (2/2).

- [ ] **Step 11: Commit**

```bash
git add api/prisma api/src/students/nivel.ts api/src/students/nivel-progreso.spec.ts api/src/points api/src/app.module.ts api/test/points-service.e2e-spec.ts
git commit -m "feat(api): add events/points schema and transactional PointsService"
```

---

### Task 2: Eventos — CRUD admin + catálogo público

**Files:**
- Create: `api/src/events/dto/event.dto.ts`
- Create: `api/src/events/events.service.ts`
- Create: `api/src/events/events-admin.controller.ts`
- Create: `api/src/events/events.controller.ts`
- Create: `api/src/events/events.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/events.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `PointsService` (importa `PointsModule`), `SessionGuard`, `RolesGuard`, `@CurrentUser`.
- Produces:
  - `CreateEventDto { titulo, descripcion, categoria('deportivo'|'cultural'|'taller'), fecha(ISO), lugar, puntosOtorgados(int≥0), activo? }`; `UpdateEventDto` (todos opcionales).
  - `EventsService.listAdmin()` (incluye inactivos), `.listPublic()` (solo activos), `.create(dto)`, `.update(id,dto)` (404), `.remove(id)` (404), `.checkin(eventId, credentialToken, otorgadoPor)` — usada en Task 3.
  - `GET /events` (público, activos), `GET/POST /admin/events`, `PATCH/DELETE /admin/events/:id` — admin/gestor; DELETE 204.
  - **Este task registra el `checkin` en el servicio** pero su endpoint HTTP y sus tests van en Task 3.

- [ ] **Step 1: Escribir los DTOs**

`api/src/events/dto/event.dto.ts`:
```ts
import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateEventDto {
  @IsString() @IsNotEmpty() titulo: string;
  @IsString() @IsNotEmpty() descripcion: string;
  @IsIn(['deportivo', 'cultural', 'taller']) categoria: 'deportivo' | 'cultural' | 'taller';
  @IsDateString() fecha: string;
  @IsString() @IsNotEmpty() lugar: string;
  @IsInt() @Min(0) puntosOtorgados: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @IsNotEmpty() titulo?: string;
  @IsOptional() @IsString() @IsNotEmpty() descripcion?: string;
  @IsOptional() @IsIn(['deportivo', 'cultural', 'taller']) categoria?: 'deportivo' | 'cultural' | 'taller';
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @IsString() @IsNotEmpty() lugar?: string;
  @IsOptional() @IsInt() @Min(0) puntosOtorgados?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class CheckinDto {
  @IsString() @IsNotEmpty() credentialToken: string;
}
```

- [ ] **Step 2: Escribir el test e2e (falla)**

`api/test/events.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Events CRUD + public catalog', () => {
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
    await prisma.event.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('sin sesión no puede crear eventos -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/admin/events')
      .send({ titulo: 'X', descripcion: 'd', categoria: 'cultural', fecha: '2026-08-01T18:00:00.000Z', lugar: 'Plaza', puntosOtorgados: 100 });
    expect(res.status).toBe(401);
  });

  it('admin crea, lista, edita y borra un evento', async () => {
    const create = await request(app.getHttpServer()).post('/admin/events').set('Cookie', cookie)
      .send({ titulo: 'Torneo', descripcion: 'futbol', categoria: 'deportivo', fecha: '2026-08-10T17:00:00.000Z', lugar: 'Cancha', puntosOtorgados: 350 });
    expect(create.status).toBe(201);
    expect(create.body.puntosOtorgados).toBe(350);
    const id = create.body.id;
    ids.push(id);

    const list = await request(app.getHttpServer()).get('/admin/events').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.find((e: any) => e.id === id)).toBeDefined();

    const upd = await request(app.getHttpServer()).patch(`/admin/events/${id}`).set('Cookie', cookie)
      .send({ puntosOtorgados: 400, activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.puntosOtorgados).toBe(400);
    expect(upd.body.activo).toBe(false);

    const del = await request(app.getHttpServer()).delete(`/admin/events/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
  });

  it('GET /events es público y solo muestra activos', async () => {
    const activo = await request(app.getHttpServer()).post('/admin/events').set('Cookie', cookie)
      .send({ titulo: 'Activo', descripcion: 'd', categoria: 'cultural', fecha: '2026-08-20T17:00:00.000Z', lugar: 'Teatro', puntosOtorgados: 200 });
    ids.push(activo.body.id);
    const inactivo = await request(app.getHttpServer()).post('/admin/events').set('Cookie', cookie)
      .send({ titulo: 'Inactivo', descripcion: 'd', categoria: 'cultural', fecha: '2026-08-21T17:00:00.000Z', lugar: 'Teatro', puntosOtorgados: 200, activo: false });
    ids.push(inactivo.body.id);

    const pub = await request(app.getHttpServer()).get('/events'); // sin cookie
    expect(pub.status).toBe(200);
    const idsPub = pub.body.map((e: any) => e.id);
    expect(idsPub).toContain(activo.body.id);
    expect(idsPub).not.toContain(inactivo.body.id);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- events`
Expected: FAIL (rutas no existen).

- [ ] **Step 4: Implementar `EventsService`**

`api/src/events/events.service.ts`:
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

const PUBLIC = { id: true, titulo: true, descripcion: true, categoria: true, fecha: true, lugar: true, puntosOtorgados: true } as const;

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService, private points: PointsService) {}

  listAdmin() {
    return this.prisma.event.findMany({ orderBy: { fecha: 'desc' } });
  }

  listPublic() {
    return this.prisma.event.findMany({ where: { activo: true }, select: PUBLIC, orderBy: { fecha: 'asc' } });
  }

  create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        titulo: dto.titulo, descripcion: dto.descripcion, categoria: dto.categoria,
        fecha: new Date(dto.fecha), lugar: dto.lugar, puntosOtorgados: dto.puntosOtorgados,
        activo: dto.activo ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    const data: Prisma.EventUpdateInput = { ...dto };
    if (dto.fecha) data.fecha = new Date(dto.fecha);
    return this.prisma.event.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.event.delete({ where: { id } });
  }

  // Usada por el endpoint de check-in (Task 3). Atómica: crea el check-in y otorga puntos.
  async checkin(eventId: string, credentialToken: string, otorgadoPor: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.activo) throw new NotFoundException('Evento no encontrado o inactivo');
    const student = await this.prisma.student.findUnique({
      where: { credentialToken },
      select: { id: true, nombreCompleto: true },
    });
    if (!student) throw new NotFoundException('Credencial no encontrada');

    const ya = await this.prisma.eventCheckin.findUnique({
      where: { eventId_studentId: { eventId, studentId: student.id } },
      select: { id: true },
    });
    if (ya) throw new ConflictException('Este joven ya hizo check-in en este evento');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.eventCheckin.create({ data: { eventId, studentId: student.id, otorgadoPor } });
      return this.points.award(tx, student.id, 'evento', eventId, event.puntosOtorgados);
    });

    return {
      student: { nombreCompleto: student.nombreCompleto, nivel: updated.nivel },
      puntosOtorgados: event.puntosOtorgados,
      puntosAcumulados: updated.puntosAcumulados,
    };
  }
}
```

- [ ] **Step 5: Implementar los controllers y el módulo**

`api/src/events/events-admin.controller.ts`:
```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, CheckinDto } from './dto/event.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/events')
export class EventsAdminController {
  constructor(private events: EventsService) {}

  @Get()
  list() { return this.events.listAdmin(); }

  @Post()
  create(@Body() dto: CreateEventDto) { return this.events.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) { return this.events.update(id, dto); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.events.remove(id); }

  @Post(':id/checkin')
  checkin(@Param('id') id: string, @Body() dto: CheckinDto, @CurrentUser() user: any) {
    return this.events.checkin(id, dto.credentialToken, user.id);
  }
}
```

`api/src/events/events.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Get()
  list() { return this.events.listPublic(); }
}
```

`api/src/events/events.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PointsModule } from '../points/points.module';
import { EventsService } from './events.service';
import { EventsAdminController } from './events-admin.controller';
import { EventsController } from './events.controller';

@Module({
  imports: [AuthModule, PointsModule],
  controllers: [EventsAdminController, EventsController],
  providers: [EventsService],
})
export class EventsModule {}
```

En `api/src/app.module.ts`: importa `EventsModule` y añádelo al array `imports`.

- [ ] **Step 6: Verificar que pasa**

Run: `cd api && npm run test:e2e -- events`
Expected: PASS (3/3).

- [ ] **Step 7: Commit**

```bash
git add api/src/events api/src/app.module.ts api/test/events.e2e-spec.ts
git commit -m "feat(api): add events admin CRUD and public catalog"
```

---

### Task 3: Check-in por QR + endpoint de puntos del joven

**Files:**
- Modify: `api/src/students/students.controller.ts`
- Modify: `api/src/students/students.module.ts`
- Create: `api/test/checkin.e2e-spec.ts`

**Interfaces:**
- Consumes: `PointsService` (StudentsModule importa `PointsModule`), `EventsService.checkin` (ya expuesto por `POST /admin/events/:id/checkin` de Task 2), `StudentGuard`, `@CurrentStudent`.
- Produces:
  - `GET /students/me/points` (StudentGuard) → `PointsService.getSummary(student.id)`.
  - Verificación E2E del flujo completo de check-in: otorga puntos, recalcula nivel, único por evento (409), token/evento inválido (404), y el joven ve el movimiento en `/students/me/points`.

- [ ] **Step 1: Añadir el endpoint de puntos del estudiante**

En `api/src/students/students.controller.ts`, importa el servicio de puntos:
```ts
import { PointsService } from '../points/points.service';
```
Cambia el constructor para inyectarlo:
```ts
  constructor(private students: StudentsService, private points: PointsService) {}
```
Y añade el endpoint (junto a los otros `@UseGuards(StudentGuard)`):
```ts
  @UseGuards(StudentGuard)
  @Get('me/points')
  getPoints(@CurrentStudent() student: any) {
    return this.points.getSummary(student.id);
  }
```

En `api/src/students/students.module.ts`: importa `PointsModule` y añádelo al array `imports` (junto a `AuthModule`, `StorageModule`).
```ts
import { PointsModule } from '../points/points.module';
// ...
  imports: [AuthModule, StorageModule, PointsModule],
```

- [ ] **Step 2: Escribir el test e2e del flujo completo (falla)**

`api/test/checkin.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';
import { randomBytes } from 'crypto';

describe('Event check-in flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let studentCookie: string;
  let studentId: string;
  let credentialToken: string;
  let eventId: string;
  const correo = `chk${Date.now()}@t.com`;

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

    credentialToken = randomBytes(16).toString('base64url');
    const s = await prisma.student.create({
      data: {
        nombreCompleto: 'Check Test', fechaNacimiento: new Date('2005-01-01'), curp: `CK${Date.now()}`,
        sexo: 'F', escolaridad: 'prepa', correo, telefono: '00',
        calle: 'x', colonia: 'y', codigoPostal: '00000', numExt: '1',
        credentialToken, passwordHash: await pass.hash('x12345678'),
      },
    });
    studentId = s.id;
    const slogin = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'x12345678', remember: false });
    studentCookie = slogin.headers['set-cookie'];

    const ev = await request(app.getHttpServer()).post('/admin/events').set('Cookie', adminCookie)
      .send({ titulo: 'Feria', descripcion: 'd', categoria: 'cultural', fecha: '2026-09-01T17:00:00.000Z', lugar: 'Centro', puntosOtorgados: 600 });
    eventId = ev.body.id;
  });
  afterAll(async () => {
    await prisma.eventCheckin.deleteMany({ where: { studentId } });
    await prisma.pointsMovement.deleteMany({ where: { studentId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.session.deleteMany({ where: { principalId: studentId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await app.close();
  });

  it('check-in otorga puntos y sube de nivel', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`).set('Cookie', adminCookie)
      .send({ credentialToken });
    expect(res.status).toBe(201);
    expect(res.body.puntosOtorgados).toBe(600);
    expect(res.body.puntosAcumulados).toBe(600);
    expect(res.body.student.nivel).toBe('plata'); // 600 → plata
  });

  it('segundo check-in del mismo joven al mismo evento -> 409', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`).set('Cookie', adminCookie)
      .send({ credentialToken });
    expect(res.status).toBe(409);
  });

  it('token inexistente -> 404', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`).set('Cookie', adminCookie)
      .send({ credentialToken: 'no-existe' });
    expect(res.status).toBe(404);
  });

  it('el joven ve su movimiento y stats en /students/me/points', async () => {
    const res = await request(app.getHttpServer()).get('/students/me/points').set('Cookie', studentCookie);
    expect(res.status).toBe(200);
    expect(res.body.puntosAcumulados).toBe(600);
    expect(res.body.nivel).toBe('plata');
    expect(res.body.eventosAsistidos).toBe(1);
    expect(res.body.movimientos.length).toBe(1);
    expect(res.body.movimientos[0].puntos).toBe(600);
  });

  it('check-in requiere sesión de staff -> 401 sin cookie', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`)
      .send({ credentialToken });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd api && npm run test:e2e -- checkin`
Expected: FAIL (`/students/me/points` no existe todavía; el resto del flujo depende de él).

- [ ] **Step 4: Verificar que pasa**

Run: `cd api && npm run test:e2e -- checkin`
Expected: PASS (5/5). (La implementación del endpoint ya se hizo en el Step 1.)

- [ ] **Step 5: Correr toda la suite (sin regresiones)**

Run: `cd api && nvm use 20.19.1 && npm test && npm run test:e2e`
Expected: unit y e2e verdes (incluye points-service, events, checkin además de lo anterior).

- [ ] **Step 6: Commit**

```bash
git add api/src/students/students.controller.ts api/src/students/students.module.ts api/test/checkin.e2e-spec.ts
git commit -m "feat(api): add QR check-in point award and student points endpoint"
```

---

### Task 4: Frontend estudiante — `/mis-puntos` y `/eventos`

**Files:**
- Create: `web/src/app/(estudiante)/mis-puntos/page.tsx`
- Create: `web/src/app/(estudiante)/eventos/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET /students/me/points`, `GET /events`.
- Produces:
  - `/mis-puntos` — nivel actual, puntos acumulados, barra de progreso al siguiente nivel (`porcentaje`), eventos asistidos, historial de movimientos. Redirige a `/ingresar` si no hay sesión (401).
  - `/eventos` — catálogo público de eventos activos (título, categoría, fecha, lugar, puntos). No requiere sesión.

- [ ] **Step 1: Crear `/mis-puntos`**

`web/src/app/(estudiante)/mis-puntos/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type Mov = { id: string; tipo: string; referencia: string | null; puntos: number; createdAt: string };
type Summary = {
  puntosAcumulados: number; nivel: string; siguiente: string | null;
  puntosParaSiguiente: number; porcentaje: number; eventosAsistidos: number; movimientos: Mov[];
};

export default function MisPuntosPage() {
  const router = useRouter();
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api('/students/me/points').then(async (r) => {
      if (r.ok) setS(await r.json());
      else router.push('/ingresar');
    }).catch(() => router.push('/ingresar'));
  }, [router]);

  if (!s) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis puntos</h1>
        <p className="mt-1 text-3xl font-bold">{s.puntosAcumulados} pts</p>
        <p className="text-sm capitalize text-gray-600">Nivel: <b>{s.nivel}</b></p>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span className="capitalize">{s.nivel}</span>
          <span className="capitalize">{s.siguiente ?? 'máximo'}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full bg-black" style={{ width: `${s.porcentaje}%` }} />
        </div>
        {s.siguiente && (
          <p className="mt-1 text-xs text-gray-500">Te faltan {s.puntosParaSiguiente} pts para {s.siguiente}.</p>
        )}
      </div>

      <p className="text-sm text-gray-600">Eventos asistidos: <b>{s.eventosAsistidos}</b></p>

      <div>
        <h2 className="mb-2 text-sm font-medium">Historial</h2>
        {s.movimientos.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes movimientos.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {s.movimientos.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="capitalize">{m.tipo}</span>
                <span className="font-semibold text-green-600">+{m.puntos}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Crear `/eventos`**

`web/src/app/(estudiante)/eventos/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Event = { id: string; titulo: string; descripcion: string; categoria: string; fecha: string; lugar: string; puntosOtorgados: number };

export default function EventosPage() {
  const [items, setItems] = useState<Event[]>([]);

  useEffect(() => {
    api('/events').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Eventos</h1>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No hay eventos disponibles por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{e.titulo}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">{e.categoria}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{e.descripcion}</p>
              <p className="mt-2 text-xs text-gray-500">
                {new Date(e.fecha).toLocaleString()} · {e.lugar}
              </p>
              <p className="mt-1 text-sm font-semibold text-green-600">+{e.puntosOtorgados} pts por asistir</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y rutas**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK; `/mis-puntos` y `/eventos` aparecen en la lista de rutas. (Si es práctico con servidores arriba: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/eventos` → 200.)

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add student points and events catalog pages"
```

---

### Task 5: Frontend admin — `/panel/eventos` (CRUD) + nav

**Files:**
- Modify: `web/src/app/(admin)/panel/layout.tsx`
- Create: `web/src/app/(admin)/panel/eventos/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET/POST /admin/events`, `PATCH/DELETE /admin/events/:id`.
- Produces:
  - Nav del panel gana enlace **Eventos** (`/panel/eventos`) para todos los roles internos (junto a Estudiantes/Intereses).
  - `/panel/eventos` — lista de eventos (título, categoría, fecha, puntos, activo); crear (título, descripción, categoría, fecha, lugar, puntos); activar/desactivar; borrar (confirmación + feedback); enlace a `/panel/eventos/checkin`.

- [ ] **Step 1: Añadir el enlace al nav del layout**

En `web/src/app/(admin)/panel/layout.tsx`, dentro del `<nav>`, añade (junto a los enlaces existentes):
```tsx
<Link href="/panel/eventos">Eventos</Link>
```

- [ ] **Step 2: Crear la página de eventos**

`web/src/app/(admin)/panel/eventos/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';

type Event = { id: string; titulo: string; categoria: string; fecha: string; lugar: string; puntosOtorgados: number; activo: boolean };

const CATS = ['deportivo', 'cultural', 'taller'];

export default function PanelEventosPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [f, setF] = useState({ titulo: '', descripcion: '', categoria: 'cultural', fecha: '', lugar: '', puntosOtorgados: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/events');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/events', {
      method: 'POST',
      body: JSON.stringify({
        ...f,
        fecha: new Date(f.fecha).toISOString(),
        puntosOtorgados: Number(f.puntosOtorgados),
      }),
    });
    if (res.ok) { setF({ titulo: '', descripcion: '', categoria: 'cultural', fecha: '', lugar: '', puntosOtorgados: '' }); await load(); }
    else setError('Revisa los datos (fecha y puntos).');
  }

  async function toggleActivo(ev: Event) {
    const res = await api(`/admin/events/${ev.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !ev.activo }) });
    if (res.ok) await load(); else setError('No se pudo actualizar.');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este evento?')) return;
    const res = await api(`/admin/events/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eventos</h1>
        <Link href="/panel/eventos/checkin" className="rounded bg-black px-3 py-1 text-sm text-white">Check-in con QR</Link>
      </div>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Título" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
        <select className="rounded border p-2" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
          {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="col-span-2 rounded border p-2" placeholder="Descripción" required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        <input className="rounded border p-2" type="datetime-local" required value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        <input className="rounded border p-2" placeholder="Lugar" required value={f.lugar} onChange={(e) => setF({ ...f, lugar: e.target.value })} />
        <input className="col-span-2 rounded border p-2" type="number" min={0} placeholder="Puntos otorgados" required value={f.puntosOtorgados} onChange={(e) => setF({ ...f, puntosOtorgados: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear evento</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((ev) => (
          <li key={ev.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{ev.titulo} · <span className="capitalize">{ev.categoria}</span> · <b>{ev.puntosOtorgados}pts</b> {ev.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => toggleActivo(ev)}>{ev.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(ev.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Verificar build y ruta**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK; `/panel/eventos` en la lista de rutas.

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add events admin CRUD page and nav link"
```

---

### Task 6: Frontend admin — escáner de check-in `/panel/eventos/checkin`

**Files:**
- Create: `web/src/app/(admin)/panel/eventos/checkin/page.tsx`

**Interfaces:**
- Consumes: `api()`, `GET /admin/events`, `POST /admin/events/:id/checkin`, `Html5Qrcode` (`html5-qrcode`, ya instalado).
- Produces: `/panel/eventos/checkin` — el staff elige un evento activo, escanea el QR de la credencial (o pega token/URL) y ve confirmación (nombre, nivel, puntos otorgados, total). Reutiliza el patrón anti-doble-escaneo del módulo comercio (`busyRef` + `mountedRef` + `scannerRef`).

- [ ] **Step 1: Crear la página del escáner**

`web/src/app/(admin)/panel/eventos/checkin/page.tsx`:
```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../../../lib/api';

type Event = { id: string; titulo: string; activo: boolean };
type Result = { student: { nombreCompleto: string; nivel: string }; puntosOtorgados: number; puntosAcumulados: number };

// Acepta la URL `.../c/<token>` o el token pelón.
function extractToken(value: string): string {
  const t = value.trim();
  const idx = t.lastIndexOf('/c/');
  if (idx >= 0) return t.slice(idx + 3).split(/[/?#]/)[0];
  return t;
}

export default function CheckinPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    api('/admin/events').then(async (r) => {
      if (!mountedRef.current) return;
      if (r.ok) {
        const list: Event[] = await r.json();
        const activos = list.filter((e) => e.activo);
        setEvents(activos);
        if (activos[0]) setEventId(activos[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    scannerRef.current?.stop().catch(() => {});
  }, []);

  async function checkin(rawValue: string) {
    setError(''); setResult(null);
    if (!eventId) { setError('Selecciona un evento.'); return; }
    const credentialToken = extractToken(rawValue);
    if (!credentialToken) { setError('Token vacío.'); return; }
    try {
      const res = await api(`/admin/events/${eventId}/checkin`, { method: 'POST', body: JSON.stringify({ credentialToken }) });
      if (!mountedRef.current) return;
      if (res.ok) setResult(await res.json());
      else if (res.status === 409) setError('Este joven ya hizo check-in en este evento.');
      else if (res.status === 404) setError('Credencial o evento no válido.');
      else setError('No se pudo registrar el check-in.');
    } catch {
      if (!mountedRef.current) return;
      setError('No se pudo conectar con el servidor.');
    }
  }

  async function startScan() {
    setError('');
    busyRef.current = false;
    const scanner = new Html5Qrcode('qr-reader');
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (decoded) => {
          if (busyRef.current) return;
          busyRef.current = true;
          try {
            await scanner.stop().catch(() => {});
            scannerRef.current = null;
            setScanning(false);
            await checkin(decoded);
          } finally {
            busyRef.current = false;
          }
        },
        () => {},
      );
      scannerRef.current = scanner;
      setScanning(true);
    } catch {
      await scanner.stop().catch(() => {});
      scannerRef.current = null;
      setScanning(false);
      setError('No se pudo abrir la cámara. Usa la entrada manual.');
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-xl font-semibold">Check-in de evento</h1>

      <select className="w-full rounded border p-2" value={eventId} onChange={(e) => setEventId(e.target.value)}>
        {events.length === 0 && <option value="">No hay eventos activos</option>}
        {events.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
      </select>

      <div id="qr-reader" className="w-full" />
      <button className="w-full rounded bg-black p-2 text-white disabled:opacity-50" onClick={startScan} disabled={scanning || !eventId}>
        Escanear con cámara
      </button>

      <form onSubmit={(e) => { e.preventDefault(); checkin(manual); }} className="space-y-2">
        <input className="w-full rounded border p-2" placeholder="…o pega el token / URL de la credencial"
          value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="w-full rounded border p-2" type="submit">Registrar manualmente</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded-xl border p-4">
          <p className="text-lg font-semibold">{result.student.nombreCompleto}</p>
          <p className="text-sm">Nivel: <b className="capitalize">{result.student.nivel}</b></p>
          <p className="mt-2 text-2xl font-bold text-green-600">+{result.puntosOtorgados} pts</p>
          <p className="text-sm text-gray-500">Total: {result.puntosAcumulados} pts</p>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verificar build y ruta**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK; `/panel/eventos/checkin` en la lista de rutas.

- [ ] **Step 3: Verificación E2E manual del flujo completo**

Con API (`npm run start:dev`, `npm run db:seed`) y web arriba, sesión admin: en **Eventos** crea un evento activo con puntos; entra a **Check-in con QR**, selecciona el evento; abre la credencial de un joven de prueba (`/c/<token>`) en otro dispositivo/pestaña y escanea su QR (o pega el token). Verifica que la respuesta muestra nombre/nivel/puntos y que, iniciando sesión como ese joven, en **/mis-puntos** aparecen los puntos, el nivel recalculado, el conteo de eventos asistidos y el movimiento en el historial. Repite el escaneo del mismo joven → debe rechazar con 409.
Expected: check-in otorga puntos una sola vez por evento+joven, recalcula nivel y el joven lo ve reflejado.

- [ ] **Step 4: Commit**

```bash
git add web/src/app
git commit -m "feat(web): add event QR check-in scanner page"
```

---

## Self-Review

**Spec coverage (Plan 07 vs spec §3.1 #5-6, §3.2 Eventos, §3.4, §4):**
- Puntos y niveles (umbrales, historial, estadísticas): Task 1 (`PointsService`, `progresoNivel`) + Task 3 (`GET /students/me/points`) + Task 4 (`/mis-puntos`). ✅ Reutiliza `nivelForPuntos` sin redefinir umbrales.
- Eventos + QR check-in (catálogo por categoría; check-in otorga puntos): Task 2 (CRUD + catálogo) + Task 3 (check-in) + Tasks 4/5/6 (frontend). ✅
- Modelo de datos `Event`/`EventCheckin`/`PointsMovement` (check-in único por evento+estudiante, otorgadoPor): Task 1. ✅
- Mecanismo QR unificado §3.4: el mismo `credentialToken` del Plan 03 se escanea; el staff (admin/gestor) hace check-in con sesión autenticada; el escáner reutiliza el componente del módulo comercio. ✅
- Panel Eventos §3.2 (CRUD + gestión de check-in): Tasks 2, 5, 6. ✅

**Placeholder scan:** sin TBD/TODO; todo el código completo e inline.

**Type consistency:** `PointsService.award(tx, studentId, tipo, referencia, puntos)` con `tx: Prisma.TransactionClient` se invoca igual en el test (Task 1) y en `EventsService.checkin` (Task 2). `getSummary` devuelve `{ puntosAcumulados, nivel, siguiente, puntosParaSiguiente, porcentaje, eventosAsistidos, movimientos }`, consumido idéntico por el endpoint (Task 3) y por `/mis-puntos` (Task 4). `checkin` devuelve `{ student:{nombreCompleto,nivel}, puntosOtorgados, puntosAcumulados }`, consumido igual por el test (Task 3) y el escáner (Task 6). Categorías `deportivo|cultural|taller` uniformes entre DTO (`@IsIn`), enum Prisma y selects del frontend. El nivel nunca se setea a mano: siempre `nivelForPuntos(nuevoTotal)`.

**Seguridad:** `/admin/events*` y check-in con `@Roles('admin','gestor')`; `GET /events` público solo-activos (sin datos sensibles); check-in exige sesión de staff (401 sin cookie) además del token no adivinable; la atomicidad (`$transaction`) evita puntos sin check-in y viceversa; el `@@unique` evita doble otorgamiento.

## Próximos planes
- **08** — Cursos/talleres (catálogo informativo) + Bolsa de trabajo (directorio de vacantes), ambos con CRUD admin y solo-lectura para el estudiante (spec §3.1 #9-10, §4 `Workshop`/`JobPosting`).
- **09** — PWA instalable (manifest + service worker `@ducanh2912/next-pwa` + meta Safari). **10** — Hardening + despliegue (incluye RELEASE-BLOCKER: cifrado en reposo del INE + restricción R2).
