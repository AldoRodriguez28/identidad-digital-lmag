import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Commerce validate', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const studentIds: string[] = [];
  let cookie: string;
  let token: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    // comercio semilla
    const login = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email: 'comercio@demo.local', password: 'Comercio123!', remember: false });
    cookie = login.headers['set-cookie'];
    // estudiante nuevo
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Val Estu', fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo: `val${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    studentIds.push(reg.body.id);
    token = reg.body.credentialToken;
  });
  afterAll(async () => {
    await prisma.benefitUsage.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await app.close();
  });

  it('valida token -> devuelve nivel + descuento SIN registrar (solo consulta)', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/validate')
      .set('Cookie', cookie).send({ credentialToken: token });
    expect(res.status).toBe(201);
    expect(res.body.student.nombreCompleto).toBe('Val Estu');
    expect(res.body.student.nivel).toBe('bronce');
    expect(res.body.porcentajeDescuento).toBe(15);
    // NO debe filtrar datos sensibles del estudiante
    expect(res.body.student.correo).toBeUndefined();
    expect(res.body.student.curp).toBeUndefined();
    expect(res.body.student.id).toBeUndefined();
    expect(res.body.student.telefono).toBeUndefined();
    expect(res.body.student.ineFrente).toBeUndefined();
    expect(res.body.student.passwordHash).toBeUndefined();
    // validate ya NO registra: el registro ocurre al capturar el monto (purchase)
    const count = await prisma.benefitUsage.count({ where: { studentId: studentIds[0] } });
    expect(count).toBe(0);
  });

  it('purchase con monto -> registra uso y calcula descuento', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/purchase')
      .set('Cookie', cookie).send({ credentialToken: token, monto: 200 });
    expect(res.status).toBe(201);
    expect(res.body.monto).toBe(200);
    expect(res.body.porcentajeDescuento).toBe(15);
    expect(res.body.descuento).toBe(30); // 15% de 200
    expect(res.body.montoFinal).toBe(170);
    const count = await prisma.benefitUsage.count({ where: { studentId: studentIds[0] } });
    expect(count).toBe(1);
  });

  it('token inexistente -> 404', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/validate')
      .set('Cookie', cookie).send({ credentialToken: 'no-existe' });
    expect(res.status).toBe(404);
  });

  it('sin sesión de comercio -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/commerce/validate')
      .send({ credentialToken: token });
    expect(res.status).toBe(401);
  });
});
