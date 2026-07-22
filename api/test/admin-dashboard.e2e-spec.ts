import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin dashboard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app.close());

  async function adminCookie() {
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
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
});
