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
