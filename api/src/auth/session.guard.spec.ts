import { UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

function ctx(cookies: Record<string, string>) {
  const req: any = { cookies };
  return { switchToHttp: () => ({ getRequest: () => req }), _req: req } as any;
}

describe('SessionGuard', () => {
  it('lanza 401 si no hay cookie', async () => {
    const guard = new SessionGuard({ resolve: async () => null } as any);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adjunta user y permite si la sesión resuelve', async () => {
    const user = { id: 'u1', rol: 'admin' };
    const guard = new SessionGuard({ resolve: async () => ({ user }) } as any);
    const c = ctx({ idsid: 'sess1' });
    expect(await guard.canActivate(c)).toBe(true);
    expect(c._req.user).toEqual(user);
  });

  it('lanza 401 si la sesión no existe o expiró', async () => {
    const guard = new SessionGuard({ resolve: async () => null } as any);
    await expect(guard.canActivate(ctx({ idsid: 'expired' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
