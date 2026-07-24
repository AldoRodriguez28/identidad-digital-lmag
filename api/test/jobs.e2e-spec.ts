import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Job postings CRUD + public catalog', () => {
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
    await prisma.jobPosting.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('sin sesión no puede crear vacantes -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/admin/jobs')
      .send({ puesto: 'X', empresa: 'e', requisitos: 'r', contacto: 'c' });
    expect(res.status).toBe(401);
  });

  it('admin crea, lista, edita y borra una vacante', async () => {
    const create = await request(app.getHttpServer()).post('/admin/jobs').set('Cookie', cookie)
      .send({ puesto: 'Cajero', empresa: 'Tienda', requisitos: 'Prepa', contacto: 'rh@tienda.com' });
    expect(create.status).toBe(201);
    expect(create.body.puesto).toBe('Cajero');
    const id = create.body.id;
    ids.push(id);

    const list = await request(app.getHttpServer()).get('/admin/jobs').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.find((j: any) => j.id === id)).toBeDefined();

    const upd = await request(app.getHttpServer()).patch(`/admin/jobs/${id}`).set('Cookie', cookie)
      .send({ empresa: 'Tienda MX', activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.empresa).toBe('Tienda MX');
    expect(upd.body.activo).toBe(false);

    const del = await request(app.getHttpServer()).delete(`/admin/jobs/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
  });

  it('GET /jobs es público y solo muestra activos', async () => {
    const activo = await request(app.getHttpServer()).post('/admin/jobs').set('Cookie', cookie)
      .send({ puesto: 'Mesero', empresa: 'Café', requisitos: 'Ninguno', contacto: 'cafe@x.com' });
    ids.push(activo.body.id);
    const inactivo = await request(app.getHttpServer()).post('/admin/jobs').set('Cookie', cookie)
      .send({ puesto: 'Oculto', empresa: 'Café', requisitos: 'Ninguno', contacto: 'cafe@x.com', activo: false });
    ids.push(inactivo.body.id);

    const pub = await request(app.getHttpServer()).get('/jobs'); // sin cookie
    expect(pub.status).toBe(200);
    const idsPub = pub.body.map((j: any) => j.id);
    expect(idsPub).toContain(activo.body.id);
    expect(idsPub).not.toContain(inactivo.body.id);
  });
});
