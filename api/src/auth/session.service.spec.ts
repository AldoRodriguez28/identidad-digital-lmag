import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const prisma = new PrismaService();
  const svc = new SessionService(prisma);
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const u = await prisma.internalUser.create({
      data: { email: `s${Date.now()}@t.com`, passwordHash: 'x', nombre: 'T', rol: 'admin' },
    });
    userId = u.id;
  });
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { internalUserId: userId } });
    await prisma.internalUser.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('create + resolve devuelve el usuario', async () => {
    const s = await svc.create(userId, true);
    const r = await svc.resolve(s.id);
    expect(r?.user.id).toBe(userId);
  });

  it('destroy invalida la sesión', async () => {
    const s = await svc.create(userId, false);
    await svc.destroy(s.id);
    expect(await svc.resolve(s.id)).toBeNull();
  });

  it('resolve devuelve null para sesión expirada', async () => {
    const s = await svc.create(userId, false);
    await prisma.session.update({ where: { id: s.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await svc.resolve(s.id)).toBeNull();
  });
});
