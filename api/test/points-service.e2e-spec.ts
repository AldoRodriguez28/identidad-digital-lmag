import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/password.service';
import { PointsService } from '../src/points/points.service';
import { randomBytes } from 'crypto';

describe('PointsService', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let points: PointsService;
  let studentId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    points = app.get(PointsService);
    const pass = app.get(PasswordService);
    const s = await prisma.student.create({
      data: {
        nombreCompleto: 'Puntos Test', fechaNacimiento: new Date('2005-01-01'), curp: `PT${Date.now()}`,
        sexo: 'M', escolaridad: 'prepa', correo: `pts${Date.now()}@t.com`, telefono: '00',
        calle: 'x', colonia: 'y', codigoPostal: '00000', numExt: '1',
        credentialToken: randomBytes(16).toString('base64url'), passwordHash: await pass.hash('x12345678'),
      },
    });
    studentId = s.id;
  });
  afterAll(async () => {
    await prisma.pointsMovement.deleteMany({ where: { studentId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await app.close();
  });

  it('award suma puntos, inserta movimiento y recalcula nivel dentro de una transacción', async () => {
    const updated = await prisma.$transaction((tx) =>
      points.award(tx, studentId, 'evento', 'evt-1', 600),
    );
    expect(updated.puntosAcumulados).toBe(600);
    expect(updated.nivel).toBe('plata'); // 600 > 500 → plata
    const movs = await prisma.pointsMovement.findMany({ where: { studentId } });
    expect(movs).toHaveLength(1);
    expect(movs[0].puntos).toBe(600);
    expect(movs[0].referencia).toBe('evt-1');
  });

  it('getSummary devuelve total, nivel, progreso, eventosAsistidos e historial', async () => {
    const sum = await points.getSummary(studentId);
    expect(sum.puntosAcumulados).toBe(600);
    expect(sum.nivel).toBe('plata');
    expect(sum.siguiente).toBe('oro');
    expect(sum.movimientos.length).toBeGreaterThanOrEqual(1);
    expect(typeof sum.eventosAsistidos).toBe('number');
  });
});
