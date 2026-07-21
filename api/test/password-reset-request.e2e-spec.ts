import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Password reset request', () => {
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
    const n = Date.now(); correo = `reset${n}@t.com`;
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'R', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    expect(reg.status).toBe(201);
    ids.push(reg.body.id);
  });
  afterAll(async () => {
    await prisma.passwordReset.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('correo existente -> 201 y crea un PasswordReset', async () => {
    const res = await request(app.getHttpServer()).post('/students/password-reset/request').send({ correo });
    expect(res.status).toBe(201);
    const count = await prisma.passwordReset.count({ where: { studentId: ids[0] } });
    expect(count).toBe(1);
  });

  it('correo inexistente -> 201 y NO crea nada (no filtra)', async () => {
    const res = await request(app.getHttpServer()).post('/students/password-reset/request')
      .send({ correo: 'nadie@t.com' });
    expect(res.status).toBe(201);
    const count = await prisma.passwordReset.count({ where: { student: { correo: 'nadie@t.com' } } });
    expect(count).toBe(0);
  });
});
