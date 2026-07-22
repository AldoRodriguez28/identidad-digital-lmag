import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';

function studentPayload() {
  const n = Date.now();
  return {
    nombreCompleto: 'Test ComSep',
    fechaNacimiento: '2005-06-15',
    curp: `CSEP${n}`,
    sexo: 'M',
    escolaridad: 'Preparatoria',
    correo: `comsep${n}@t.com`,
    telefono: '5',
    calle: 'Av. Reforma',
    colonia: 'Centro',
    codigoPostal: '91000',
    numExt: '1',
    password: 'secreto123',
  };
}

describe('Commerce principal separation & inactive login', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;
  const studentIds: string[] = [];
  const commerceIds: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    passwords = app.get(PasswordService);
  });

  afterAll(async () => {
    if (studentIds.length) {
      await prisma.session.deleteMany({ where: { principalId: { in: studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    }
    if (commerceIds.length) {
      await prisma.session.deleteMany({ where: { principalId: { in: commerceIds } } });
      await prisma.commerce.deleteMany({ where: { id: { in: commerceIds } } });
    }
    await app.close();
  });

  // ── Test 1: STUDENT cookie cannot access GET /commerce/me ──────────────────
  it('STUDENT cookie cannot access GET /commerce/me → 401', async () => {
    const payload = studentPayload();

    const reg = await request(app.getHttpServer())
      .post('/students/register')
      .send(payload);
    expect(reg.status).toBe(201);
    studentIds.push(reg.body.id);

    const login = await request(app.getHttpServer())
      .post('/students/login')
      .send({ correo: payload.correo, password: payload.password, remember: false });
    expect(login.status).toBe(201);

    const studentCookie = login.headers['set-cookie'];
    expect(studentCookie).toBeDefined();

    const res = await request(app.getHttpServer())
      .get('/commerce/me')
      .set('Cookie', studentCookie);
    expect(res.status).toBe(401);
  });

  // ── Test 2: COMMERCE cookie cannot access GET /students/me ─────────────────
  it('COMMERCE cookie cannot access GET /students/me → 401', async () => {
    const login = await request(app.getHttpServer())
      .post('/commerce/login')
      .send({ email: 'comercio@demo.local', password: 'Comercio123!', remember: false });
    expect(login.status).toBe(201);

    const commerceCookie = login.headers['set-cookie'];
    expect(commerceCookie).toBeDefined();

    const res = await request(app.getHttpServer())
      .get('/students/me')
      .set('Cookie', commerceCookie);
    expect(res.status).toBe(401);
  });

  // ── Test 3: Inactive commerce cannot login even with correct password ───────
  it('inactive commerce cannot login even with correct password → 401', async () => {
    const n = Date.now();
    const plainPassword = 'test1234';
    const hash = await passwords.hash(plainPassword);

    const inactiveCommerce = await prisma.commerce.create({
      data: {
        nombre: `Inactivo ${n}`,
        email: `inactivo${n}@t.com`,
        passwordHash: hash,
        porcentajeDescuento: 10,
        activo: false,
      },
    });
    commerceIds.push(inactiveCommerce.id);

    const res = await request(app.getHttpServer())
      .post('/commerce/login')
      .send({ email: inactiveCommerce.email, password: plainPassword, remember: false });
    expect(res.status).toBe(401);
  });
});
