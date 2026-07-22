import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Commerce auth', () => {
  let app: INestApplication;
  const email = 'comercio@demo.local';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app.close());

  it('login inválido -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email, password: 'malo', remember: false });
    expect(res.status).toBe(401);
  });

  it('login válido (comercio semilla) -> cookie y /commerce/me', async () => {
    const login = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email, password: 'Comercio123!', remember: true });
    expect(login.status).toBe(201);
    expect(login.body.porcentajeDescuento).toBe(15);
    expect(login.body.passwordHash).toBeUndefined();
    const cookie = login.headers['set-cookie'];
    const me = await request(app.getHttpServer()).get('/commerce/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.nombre).toBeDefined();
  });

  it('/commerce/me sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/commerce/me');
    expect(res.status).toBe(401);
  });
});
