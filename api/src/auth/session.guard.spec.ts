import { UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

function ctx(cookies: Record<string, string>) {
  const req: any = { cookies };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}

describe('SessionGuard', () => {
  it('lanza 401 si no hay cookie', async () => {
    const guard = new SessionGuard({ resolve: async () => null } as any, {} as any);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza 401 si la sesión no resuelve', async () => {
    const guard = new SessionGuard({ resolve: async () => null } as any, {} as any);
    await expect(guard.canActivate(ctx({ idsid: 'x' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza 401 si el principal no es internal_user', async () => {
    const guard = new SessionGuard(
      { resolve: async () => ({ principalType: 'student', principalId: 's1' }) } as any,
      {} as any,
    );
    await expect(guard.canActivate(ctx({ idsid: 'x' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adjunta user y permite para internal_user activo', async () => {
    const user = { id: 'u1', rol: 'admin', activo: true };
    const prisma: any = { internalUser: { findUnique: async () => user } };
    const guard = new SessionGuard(
      { resolve: async () => ({ principalType: 'internal_user', principalId: 'u1' }) } as any,
      prisma,
    );
    const c = ctx({ idsid: 'x' });
    expect(await guard.canActivate(c)).toBe(true);
    expect(c._req.user).toEqual(user);
  });
});
