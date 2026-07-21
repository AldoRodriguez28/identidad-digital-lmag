import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function payload() {
  const n = Date.now();
  return {
    nombreCompleto: 'Ana', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
    escolaridad: 'Universidad', correo: `ana${n}@t.com`, telefono: '5', calle: 'c',
    colonia: 'x', codigoPostal: '91000', numExt: '1', password: 'secreto123',
  };
}

describe('Students auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let correo: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const p = payload(); correo = p.correo;
    const reg = await request(app.getHttpServer()).post('/students/register').send(p);
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('login inválido -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'malo', remember: false });
    expect(res.status).toBe(401);
  });

  it('login válido -> cookie y /students/me funciona', async () => {
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'secreto123', remember: true });
    expect(login.status).toBe(201);
    expect(login.body.credentialToken).toBeDefined();
    expect(login.body.passwordHash).toBeUndefined();
    const cookie = login.headers['set-cookie'];
    const me = await request(app.getHttpServer()).get('/students/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.correo).toBe(correo);
  });

  it('/students/me sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/students/me');
    expect(res.status).toBe(401);
  });
});
