import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Admin profile', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const email = `perfil${Date.now()}@t.com`;
  let userId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);
    const u = await prisma.internalUser.create({
      data: { email, passwordHash: await pass.hash('viejo1234'), nombre: 'Perfil', rol: 'gestor' },
    });
    userId = u.id;
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'viejo1234', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: userId } });
    await prisma.internalUser.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('GET /admin/me -> datos propios sin passwordHash', async () => {
    const res = await request(app.getHttpServer()).get('/admin/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('PATCH /admin/me edita el nombre', async () => {
    const res = await request(app.getHttpServer()).patch('/admin/me').set('Cookie', cookie).send({ nombre: 'Nuevo Nombre' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Nuevo Nombre');
  });

  it('cambio de contraseña con actual incorrecta -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/admin/me/password').set('Cookie', cookie)
      .send({ currentPassword: 'malo', newPassword: 'nuevo12345' });
    expect(res.status).toBe(400);
  });

  it('cambio de contraseña correcto y permite login con la nueva', async () => {
    const res = await request(app.getHttpServer()).post('/admin/me/password').set('Cookie', cookie)
      .send({ currentPassword: 'viejo1234', newPassword: 'nuevo12345' });
    expect(res.status).toBe(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'nuevo12345', remember: false });
    expect(login.status).toBe(201);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/me');
    expect(res.status).toBe(401);
  });
});
