import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

describe('Admin INE retrieval', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  const ids: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const alogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    adminCookie = alogin.headers['set-cookie'];
    // estudiante + subir INE con su sesión
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Ine Ve', fechaNacimiento: '2004-01-01', curp: `INE${n}`, sexo: 'F',
      escolaridad: 'Uni', correo: `inev${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
    const slogin = await request(app.getHttpServer()).post('/students/login')
      .send({ correo: `inev${n}@t.com`, password: 'secreto123', remember: false });
    await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', slogin.headers['set-cookie'])
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('admin descarga el frente -> 200 image/png', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}/ine/frente`).set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}/ine/frente`);
    expect(res.status).toBe(401);
  });

  it('side inválido -> 400', async () => {
    const res = await request(app.getHttpServer()).get(`/admin/students/${ids[0]}/ine/costado`).set('Cookie', adminCookie);
    expect(res.status).toBe(400);
  });
});
