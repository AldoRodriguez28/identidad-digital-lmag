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
