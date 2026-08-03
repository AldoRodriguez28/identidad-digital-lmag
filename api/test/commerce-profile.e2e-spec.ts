import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex'); // firma PNG mínima

describe('Commerce profile', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const email = `comercio-perfil${Date.now()}@t.com`;
  let commerceId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);
    const c = await prisma.commerce.create({
      data: {
        nombre: 'Comercio Perfil', descripcion: 'Original', porcentajeDescuento: 10,
        email, passwordHash: await pass.hash('viejo1234'),
      },
    });
    commerceId = c.id;
    const login = await request(app.getHttpServer()).post('/commerce/login').send({ email, password: 'viejo1234', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: commerceId } });
    await prisma.commerce.deleteMany({ where: { id: commerceId } });
    await app.close();
  });

  it('GET /commerce/me/profile -> datos propios sin passwordHash', async () => {
    const res = await request(app.getHttpServer()).get('/commerce/me/profile').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.descripcion).toBe('Original');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('PATCH /commerce/me/profile edita nombre y descripción', async () => {
    const res = await request(app.getHttpServer()).patch('/commerce/me/profile').set('Cookie', cookie)
      .send({ nombre: 'Nuevo Nombre', descripcion: 'Nueva descripción' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Nuevo Nombre');
    expect(res.body.descripcion).toBe('Nueva descripción');
  });

  it('PATCH con correo ya usado por otro comercio -> 409', async () => {
    const res = await request(app.getHttpServer()).patch('/commerce/me/profile').set('Cookie', cookie)
      .send({ email: 'comercio@demo.local' });
    expect(res.status).toBe(409);
  });

  it('cambio de contraseña con actual incorrecta -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/me/password').set('Cookie', cookie)
      .send({ currentPassword: 'malo', newPassword: 'nuevo12345' });
    expect(res.status).toBe(400);
  });

  it('cambio de contraseña correcto y permite login con la nueva', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/me/password').set('Cookie', cookie)
      .send({ currentPassword: 'viejo1234', newPassword: 'nuevo12345' });
    expect(res.status).toBe(201);
    const login = await request(app.getHttpServer()).post('/commerce/login').send({ email, password: 'nuevo12345', remember: false });
    expect(login.status).toBe(201);
  });

  it('sube logo válido -> 200, guarda key y queda servible públicamente', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/me/logo').set('Cookie', cookie)
      .attach('logo', PNG, { filename: 'logo.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.logo).toBeTruthy();
    const pub = await request(app.getHttpServer()).get(`/benefits/${commerceId}/logo`);
    expect(pub.status).toBe(200);
    expect(pub.headers['content-type']).toBe('image/png');
  });

  it('logo con mimetype PNG pero bytes falsos -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/me/logo').set('Cookie', cookie)
      .attach('logo', Buffer.from('no es una imagen'), { filename: 'logo.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('logo sin archivo -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/me/logo').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/commerce/me/profile');
    expect(res.status).toBe(401);
  });
});
