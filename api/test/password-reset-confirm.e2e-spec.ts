import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Password reset confirm', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: string[] = [];
  let correo: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const n = Date.now(); correo = `rc${n}@t.com`;
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'RC', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'viejo1234',
    });
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.passwordReset.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  async function freshToken() {
    await request(app.getHttpServer()).post('/students/password-reset/request').send({ correo });
    const pr = await prisma.passwordReset.findFirst({
      where: { studentId: ids[0], used: false }, orderBy: { createdAt: 'desc' },
    });
    return pr!.token;
  }

  it('confirma con token válido y permite login con la nueva contraseña', async () => {
    const token = await freshToken();
    const res = await request(app.getHttpServer()).post('/students/password-reset/confirm')
      .send({ token, password: 'nuevo12345' });
    expect(res.status).toBe(201);
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'nuevo12345', remember: false });
    expect(login.status).toBe(201);
  });

  it('reutilizar el token -> 400', async () => {
    const token = await freshToken();
    await request(app.getHttpServer()).post('/students/password-reset/confirm').send({ token, password: 'otra12345' });
    const again = await request(app.getHttpServer()).post('/students/password-reset/confirm').send({ token, password: 'otra12345' });
    expect(again.status).toBe(400);
  });

  it('token inexistente -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/students/password-reset/confirm')
      .send({ token: 'no-existe', password: 'otra12345' });
    expect(res.status).toBe(400);
  });

  it('token expirado -> 400', async () => {
    const token = await freshToken();
    await prisma.passwordReset.updateMany({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app.getHttpServer()).post('/students/password-reset/confirm')
      .send({ token, password: 'otra12345' });
    expect(res.status).toBe(400);
  });
});
