import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function ctx(user: any) {
  const req: any = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function guardWith(required: any) {
  const reflector: any = { getAllAndOverride: () => required };
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('(a) lanza ForbiddenException si el rol no coincide', () => {
    const guard = guardWith(['admin']);
    expect(() => guard.canActivate(ctx({ rol: 'gestor' }))).toThrow(ForbiddenException);
  });

  it('(b) retorna true si no hay metadatos @Roles (undefined)', () => {
    const guard = guardWith(undefined);
    expect(guard.canActivate(ctx({ rol: 'gestor' }))).toBe(true);
  });

  it('(b) retorna true si los roles requeridos son un array vacío', () => {
    const guard = guardWith([]);
    expect(guard.canActivate(ctx({ rol: 'gestor' }))).toBe(true);
  });

  it('(c) lanza ForbiddenException si user es undefined con roles requeridos', () => {
    const guard = guardWith(['admin']);
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });

  it('(opcional) retorna true si el rol es correcto', () => {
    const guard = guardWith(['admin']);
    expect(guard.canActivate(ctx({ rol: 'admin' }))).toBe(true);
  });
});
