import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function studentPayload() {
  const n = Date.now();
  return {
    nombreCompleto: 'Test Sep',
    fechaNacimiento: '2005-06-15',
    curp: `SEPA${n}`,
    sexo: 'M',
    escolaridad: 'Preparatoria',
    correo: `sep${n}@t.com`,
    telefono: '5',
    calle: 'Av. Principal',
    colonia: 'Centro',
    codigoPostal: '91000',
    numExt: '10',
    password: 'secreto123',
  };
}

describe('Principal separation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const studentIds: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (studentIds.length) {
      await prisma.session.deleteMany({ where: { principalId: { in: studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    }
    await app.close();
  });

  it('STUDENT cookie cannot access GET /auth/me (admin endpoint) → 401', async () => {
    // Register + login as student
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

    // Student cookie hitting admin-guarded endpoint should be rejected
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', studentCookie);
    expect(res.status).toBe(401);
  });

  it('ADMIN cookie cannot access GET /students/me (student endpoint) → 401', async () => {
    // Login with seeded admin
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    expect(login.status).toBe(201);

    const adminCookie = login.headers['set-cookie'];
    expect(adminCookie).toBeDefined();

    // Admin cookie hitting student-guarded endpoint should be rejected
    const res = await request(app.getHttpServer())
      .get('/students/me')
      .set('Cookie', adminCookie);
    expect(res.status).toBe(401);
  });
});
