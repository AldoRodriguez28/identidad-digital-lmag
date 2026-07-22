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
