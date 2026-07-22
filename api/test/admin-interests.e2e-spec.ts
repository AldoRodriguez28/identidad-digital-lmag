import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin interests CRUD', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const nombre = `Interés ${Date.now()}`;
  let createdId: string;

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
    if (createdId) await prisma.interest.deleteMany({ where: { id: createdId } });
    await app.close();
  });

  it('crear -> 201', async () => {
    const res = await request(app.getHttpServer()).post('/admin/interests').set('Cookie', cookie).send({ nombre });
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe(nombre);
    createdId = res.body.id;
  });

  it('crear duplicado -> 409', async () => {
    const res = await request(app.getHttpServer()).post('/admin/interests').set('Cookie', cookie).send({ nombre });
    expect(res.status).toBe(409);
  });

  it('editar -> 200', async () => {
    const res = await request(app.getHttpServer()).patch(`/admin/interests/${createdId}`).set('Cookie', cookie)
      .send({ nombre: `${nombre} editado` });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe(`${nombre} editado`);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/admin/interests').send({ nombre: 'x' });
    expect(res.status).toBe(401);
  });

  it('borrar -> 204', async () => {
    const res = await request(app.getHttpServer()).delete(`/admin/interests/${createdId}`).set('Cookie', cookie);
    expect(res.status).toBe(204);
    createdId = '';
  });
});
