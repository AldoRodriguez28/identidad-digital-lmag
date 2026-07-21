import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Credential', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let token: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Cred Uno', fechaNacimiento: '2005-05-05', curp: `CURP${n}`, sexo: 'M',
      escolaridad: 'Prepa', correo: `cred${n}@t.com`, telefono: '555', calle: 'c', colonia: 'Centro',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
    token = reg.body.credentialToken;
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('GET /c/:token devuelve solo campos seguros', async () => {
    const res = await request(app.getHttpServer()).get(`/c/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.nombreCompleto).toBe('Cred Uno');
    expect(res.body.nivel).toBe('bronce');
    expect(typeof res.body.edad).toBe('number');
    expect(res.body.colonia).toBe('Centro');
    expect(Array.isArray(res.body.intereses)).toBe(true);
    expect(res.body.redes).toBeDefined();
    // NO debe filtrar datos sensibles
    expect(res.body.correo).toBeUndefined();
    expect(res.body.curp).toBeUndefined();
    expect(res.body.telefono).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.ineFrente).toBeUndefined();
    expect(res.body.ineReverso).toBeUndefined();
    expect(res.body.id).toBeUndefined();
    expect(res.body.credentialToken).toBeUndefined();
    expect(res.body.fechaNacimiento).toBeUndefined();
    expect(res.body.calle).toBeUndefined();
    expect(res.body.codigoPostal).toBeUndefined();
    expect(res.body.numExt).toBeUndefined();
  });

  it('token inexistente -> 404', async () => {
    const res = await request(app.getHttpServer()).get('/c/no-existe-token');
    expect(res.status).toBe(404);
  });
});
