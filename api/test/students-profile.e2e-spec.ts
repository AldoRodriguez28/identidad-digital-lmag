import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Students profile', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const ids: string[] = [];
  let interestId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const n = Date.now();
    const reg = await request(app.getHttpServer()).post('/students/register').send({
      nombreCompleto: 'Leo', fechaNacimiento: '2003-02-02', curp: `CURP${n}`, sexo: 'M',
      escolaridad: 'Prepa', correo: `leo${n}@t.com`, telefono: '5', calle: 'c', colonia: 'x',
      codigoPostal: '91000', numExt: '1', password: 'secreto123',
    });
    ids.push(reg.body.id);
    const login = await request(app.getHttpServer()).post('/students/login')
      .send({ correo: `leo${n}@t.com`, password: 'secreto123', remember: false });
    cookie = login.headers['set-cookie'];
    const anInterest = await prisma.interest.findFirst();
    interestId = anInterest!.id;
  });
  afterAll(async () => {
    await prisma.studentInterest.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.session.deleteMany({ where: { principalId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('GET perfil devuelve datos e intereses vacíos', async () => {
    const res = await request(app.getHttpServer()).get('/students/me/profile').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.telefono).toBe('5');
    expect(Array.isArray(res.body.interests)).toBe(true);
    expect(res.body.interests.length).toBe(0);
  });

  it('PATCH actualiza teléfono y set de intereses', async () => {
    const res = await request(app.getHttpServer()).patch('/students/me/profile').set('Cookie', cookie)
      .send({ telefono: '9999', interestIds: [interestId] });
    expect(res.status).toBe(200);
    expect(res.body.telefono).toBe('9999');
    expect(res.body.interests.map((i: any) => i.id)).toEqual([interestId]);
  });

  it('PATCH sin cookie -> 401', async () => {
    const res = await request(app.getHttpServer()).patch('/students/me/profile').send({ telefono: '1' });
    expect(res.status).toBe(401);
  });
});
