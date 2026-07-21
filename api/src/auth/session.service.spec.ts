import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const prisma = new PrismaService();
  const svc = new SessionService(prisma);

  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { principalId: 'p-test' } });
    await prisma.$disconnect();
  });

  it('create + resolve devuelve el principal', async () => {
    const s = await svc.create('internal_user', 'p-test', true);
    const r = await svc.resolve(s.id);
    expect(r).toEqual({ principalType: 'internal_user', principalId: 'p-test' });
  });

  it('destroy invalida la sesión', async () => {
    const s = await svc.create('student', 'p-test', false);
    await svc.destroy(s.id);
    expect(await svc.resolve(s.id)).toBeNull();
  });

  it('resolve null para sesión expirada', async () => {
    const s = await svc.create('student', 'p-test', false);
    await prisma.session.update({ where: { id: s.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await svc.resolve(s.id)).toBeNull();
  });

  it('create con remember=false expira en ~1 día', async () => {
    const s = await svc.create('student', 'p-test', false);
    const ms = s.expiresAt.getTime() - Date.now();
    expect(ms).toBeGreaterThan(23 * 3600 * 1000);
    expect(ms).toBeLessThan(25 * 3600 * 1000);
  });
});
