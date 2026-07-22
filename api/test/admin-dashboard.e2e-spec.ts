import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Admin dashboard', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const gestorEmail = `gestor${Date.now()}@t.com`;
  let gestorId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);
    const gestor = await prisma.internalUser.create({
      data: {
        email: gestorEmail,
        passwordHash: await pass.hash('gestor1234'),
        nombre: 'Gestor Test',
        rol: 'gestor',
      },
    });
    gestorId = gestor.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: gestorId } });
    await prisma.internalUser.delete({ where: { id: gestorId } });
    await app.close();
  });

  async function adminCookie() {
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    return res.headers['set-cookie'];
  }

  async function gestorCookie() {
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: gestorEmail, password: 'gestor1234', remember: false });
    return res.headers['set-cookie'];
  }

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('admin -> 200 con conteos y top intereses', async () => {
    const res = await request(app.getHttpServer()).get('/admin/dashboard').set('Cookie', await adminCookie());
    expect(res.status).toBe(200);
    expect(typeof res.body.usuarios.estudiantes).toBe('number');
    expect(typeof res.body.usuarios.internos).toBe('number');
    expect(typeof res.body.usuarios.comercios).toBe('number');
    expect(Array.isArray(res.body.topIntereses)).toBe(true);
  });

  it('gestor -> 200', async () => {
    const res = await request(app.getHttpServer()).get('/admin/dashboard').set('Cookie', await gestorCookie());
    expect(res.status).toBe(200);
  });
});
