import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Benefits directory', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app.close());

  it('GET /benefits devuelve comercios activos con descuento (sin passwordHash)', async () => {
    const res = await request(app.getHttpServer()).get('/benefits');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const demo = res.body.find((c: any) => c.nombre === 'Cafetería Demo');
    expect(demo).toBeDefined();
    expect(demo.porcentajeDescuento).toBe(15);
    expect(demo.passwordHash).toBeUndefined();
    expect(demo.email).toBeUndefined();
  });
});
