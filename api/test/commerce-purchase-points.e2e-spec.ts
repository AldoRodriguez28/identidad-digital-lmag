import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Commerce purchase — puntos por compra', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const studentIds: string[] = [];
  let cookie: string;

  async function registerStudent(label: string) {
    const n = Date.now() + Math.floor(Math.random() * 100000);
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: label, fechaNacimiento: '2004-01-01', curp: `CURP${n}`, sexo: 'F',
      escolaridad: 'Uni', correo: `pts${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    studentIds.push(reg.body.id);
    return { id: reg.body.id as string, token: reg.body.credentialToken as string };
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const login = await request(app.getHttpServer()).post('/commerce/login')
      .send({ email: 'comercio@demo.local', password: 'Comercio123!', remember: false });
    cookie = login.headers['set-cookie'];
  });
  afterAll(async () => {
    await prisma.pointsMovement.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.benefitUsage.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await app.close();
  });

  it('otorga 1 punto por cada $20, con tope de 100 puntos por compra', async () => {
    const { token } = await registerStudent('Pts UnoA');
    const res = await request(app.getHttpServer()).post('/commerce/purchase')
      .set('Cookie', cookie).send({ credentialToken: token, monto: 3000 }); // 3000/20=150 -> tope 100
    expect(res.status).toBe(201);
    expect(res.body.puntosOtorgados).toBe(100);
    expect(res.body.puntosAcumulados).toBe(100);
  });

  it('bloquea una segunda compra inmediata del mismo cliente en el mismo comercio (cooldown)', async () => {
    const { token } = await registerStudent('Pts Cooldown');
    const first = await request(app.getHttpServer()).post('/commerce/purchase')
      .set('Cookie', cookie).send({ credentialToken: token, monto: 100 });
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer()).post('/commerce/purchase')
      .set('Cookie', cookie).send({ credentialToken: token, monto: 100 });
    expect(second.status).toBe(409);
  });

  it('respeta el tope diario de puntos por comercio (150/día) aunque el monto alcance para más', async () => {
    const { id, token } = await registerStudent('Pts Tope Diario');
    // Simula que ya ganó el tope diario completo por otra compra anterior hoy.
    await prisma.pointsMovement.create({
      data: { studentId: id, tipo: 'compra_comercio', referencia: 'seed-test', puntos: 150 },
    });
    await prisma.student.update({ where: { id }, data: { puntosAcumulados: 150 } });

    const res = await request(app.getHttpServer()).post('/commerce/purchase')
      .set('Cookie', cookie).send({ credentialToken: token, monto: 500 }); // alcanzaría para 25 pts, pero ya no queda tope
    expect(res.status).toBe(201);
    expect(res.body.puntosOtorgados).toBe(0);
    expect(res.body.puntosAcumulados).toBe(150);
    // La compra sí se registra aunque no otorgue puntos.
    const count = await prisma.benefitUsage.count({ where: { studentId: id } });
    expect(count).toBe(1);
  });
});
