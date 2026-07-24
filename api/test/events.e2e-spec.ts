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
