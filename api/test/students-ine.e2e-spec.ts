import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex'); // firma PNG mínima

function payload() {
  const n = Date.now();
  return {
    nombreCompleto: 'Ine', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
    escolaridad: 'Uni', correo: `ine${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
    codigoPostal: '91000', numExt: '1', password: 'secreto123',
  };
}

describe('Students INE', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let cookie: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const p = payload();
    const reg = await request(app.getHttpServer()).post('/students/register').send(p);
    ids.push(reg.body.id);
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo: p.correo, password: 'secreto123', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('sube frente y reverso -> 200 y guarda keys', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', cookie)
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const s = await prisma.student.findUnique({ where: { id: ids[0] } });
    expect(s?.ineFrente).toBeTruthy();
    expect(s?.ineReverso).toBeTruthy();
  });

  it('falta un archivo -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', cookie)
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('mimetype inválido -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', cookie)
      .attach('ineFrente', Buffer.from('x'), { filename: 'f.txt', contentType: 'text/plain' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/students/me/ine')
      .attach('ineFrente', PNG, { filename: 'f.png', contentType: 'image/png' })
      .attach('ineReverso', PNG, { filename: 'r.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('mimetype PNG pero bytes no son imagen -> 400', async () => {
    const fakeBytes = Buffer.from('esto no es una imagen');
    const res = await request(app.getHttpServer()).post('/students/me/ine').set('Cookie', cookie)
      .attach('ineFrente', fakeBytes, { filename: 'f.png', contentType: 'image/png' })
      .attach('ineReverso', fakeBytes, { filename: 'r.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });
});
