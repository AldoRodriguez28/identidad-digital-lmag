import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function payload(over: Partial<any> = {}) {
  const n = Date.now();
  return {
    nombreCompleto: 'Juan Pérez', fechaNacimiento: '2005-04-10', curp: `CURP${n}`,
    sexo: 'M', escolaridad: 'Preparatoria', correo: `juan${n}@t.com`, telefono: '555',
    calle: 'Av 1', colonia: 'Centro', codigoPostal: '91000', numExt: '10',
    password: 'secreto123', ...over,
  };
}

describe('Students register', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const created: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await prisma.student.deleteMany({ where: { id: { in: created } } });
    await app.close();
  });

  it('registro válido -> 201 con vista pública (sin passwordHash) y credentialToken', async () => {
    const res = await request(app.getHttpServer()).post('/students/register').send(payload());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nivel).toBe('bronce');
    expect(res.body.puntosAcumulados).toBe(0);
    expect(typeof res.body.credentialToken).toBe('string');
    expect(res.body.credentialToken.length).toBeGreaterThan(15);
    expect(res.body.passwordHash).toBeUndefined();
    created.push(res.body.id);
  });

  it('correo duplicado -> 409', async () => {
    const p = payload();
    const a = await request(app.getHttpServer()).post('/students/register').send(p);
    created.push(a.body.id);
    const b = await request(app.getHttpServer()).post('/students/register').send({ ...payload(), correo: p.correo });
    expect(b.status).toBe(409);
  });

  it('body inválido (sin password) -> 400', async () => {
    const { password, ...bad } = payload();
    const res = await request(app.getHttpServer()).post('/students/register').send(bad);
    expect(res.status).toBe(400);
  });

  it('CURP duplicado -> 409', async () => {
    const n = Date.now();
    const sharedCurp = `CURPDUPE${n}`;
    const first = await request(app.getHttpServer()).post('/students/register')
      .send(payload({ curp: sharedCurp, correo: `first${n}@t.com` }));
    expect(first.status).toBe(201);
    created.push(first.body.id);

    const second = await request(app.getHttpServer()).post('/students/register')
      .send(payload({ curp: sharedCurp, correo: `second${n}@t.com` }));
    expect(second.status).toBe(409);
  });

  it('interestId inexistente -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/students/register')
      .send(payload({ interestIds: ['no-existe-uuid-00000000'] }));
    expect(res.status).toBe(400);
  });
});
