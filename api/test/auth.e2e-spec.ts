import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `admin${Date.now()}@t.com`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);
    await prisma.internalUser.create({
      data: { email, passwordHash: await pass.hash('secreto123'), nombre: 'Admin', rol: 'admin' },
    });
  });
  afterAll(async () => {
    await prisma.session.deleteMany({});
    await prisma.internalUser.deleteMany({ where: { email } });
    await app.close();
  });

  it('login inválido -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login').send({ email, password: 'malo', remember: false });
    expect(res.status).toBe(401);
  });

  it('login válido -> cookie y me funciona', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login').send({ email, password: 'secreto123', remember: true });
    expect(login.status).toBe(201);
    expect(login.body.rol).toBe('admin');
    const cookie = login.headers['set-cookie'];
    expect(cookie).toBeDefined();

    const me = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.email === undefined || typeof me.body.rol === 'string').toBe(true);
    expect(me.body.rol).toBe('admin');
  });

  it('me sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
