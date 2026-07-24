import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';
import { randomBytes } from 'crypto';

describe('Event check-in flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let studentCookie: string;
  let studentId: string;
  let credentialToken: string;
  let eventId: string;
  const correo = `chk${Date.now()}@t.com`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const pass = app.get(PasswordService);

    const alogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'admin@identidad.local', password: 'Cambiar123!', remember: false });
    adminCookie = alogin.headers['set-cookie'];

    credentialToken = randomBytes(16).toString('base64url');
    const s = await prisma.student.create({
      data: {
        nombreCompleto: 'Check Test', fechaNacimiento: new Date('2005-01-01'), curp: `CK${Date.now()}`,
        sexo: 'F', escolaridad: 'prepa', correo, telefono: '00',
        calle: 'x', colonia: 'y', codigoPostal: '00000', numExt: '1',
        credentialToken, passwordHash: await pass.hash('x12345678'),
      },
    });
    studentId = s.id;
    const slogin = await request(app.getHttpServer()).post('/students/login')
      .send({ correo, password: 'x12345678', remember: false });
    studentCookie = slogin.headers['set-cookie'];

    const ev = await request(app.getHttpServer()).post('/admin/events').set('Cookie', adminCookie)
      .send({ titulo: 'Feria', descripcion: 'd', categoria: 'cultural', fecha: '2026-09-01T17:00:00.000Z', lugar: 'Centro', puntosOtorgados: 600 });
    eventId = ev.body.id;
  });
  afterAll(async () => {
    await prisma.eventCheckin.deleteMany({ where: { studentId } });
    await prisma.pointsMovement.deleteMany({ where: { studentId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.session.deleteMany({ where: { principalId: studentId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await app.close();
  });

  it('check-in otorga puntos y sube de nivel', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`).set('Cookie', adminCookie)
      .send({ credentialToken });
    expect(res.status).toBe(201);
    expect(res.body.puntosOtorgados).toBe(600);
    expect(res.body.puntosAcumulados).toBe(600);
    expect(res.body.student.nivel).toBe('plata'); // 600 → plata
  });

  it('segundo check-in del mismo joven al mismo evento -> 409', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`).set('Cookie', adminCookie)
      .send({ credentialToken });
    expect(res.status).toBe(409);
  });

  it('token inexistente -> 404', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`).set('Cookie', adminCookie)
      .send({ credentialToken: 'no-existe' });
    expect(res.status).toBe(404);
  });

  it('el joven ve su movimiento y stats en /students/me/points', async () => {
    const res = await request(app.getHttpServer()).get('/students/me/points').set('Cookie', studentCookie);
    expect(res.status).toBe(200);
    expect(res.body.puntosAcumulados).toBe(600);
    expect(res.body.nivel).toBe('plata');
    expect(res.body.eventosAsistidos).toBe(1);
    expect(res.body.movimientos.length).toBe(1);
    expect(res.body.movimientos[0].puntos).toBe(600);
  });

  it('check-in requiere sesión de staff -> 401 sin cookie', async () => {
    const res = await request(app.getHttpServer()).post(`/admin/events/${eventId}/checkin`)
      .send({ credentialToken });
    expect(res.status).toBe(401);
  });
});
