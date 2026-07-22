import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin students', () => {
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
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Admin Ve', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo: `av${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('lista paginada -> 200 con items/total, sin passwordHash', async () => {
    const res = await request(app.getHttpServer()).get('/admin/students?page=1&pageSize=10').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.items[0]?.passwordHash).toBeUndefined();
  });

  it('detalle -> 200 sin passwordHash, con ine boolean', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.correo).toBeDefined();
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.ine).toEqual({ frente: false, reverso: false });
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/students');
    expect(res.status).toBe(401);
  });

  it('baja -> 204 y luego 404', async () => {
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Borrar', fechaNacimiento: '2004-01-01', curp: `DEL${n}`, sexo: 'M',
      escolaridad: 'Uni', correo: `del${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    const delId = reg.body.id;
    const del = await request(app.getHttpServer()).delete(`/admin/students/${delId}`).set('Cookie', cookie);
    expect(del.status).toBe(204);
    const after = await request(app.getHttpServer()).get(`/admin/students/${delId}`).set('Cookie', cookie);
    expect(after.status).toBe(404);
  });
});
