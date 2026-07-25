import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private passwords: PasswordService,
    private sessions: SessionService,
  ) {}

  async login(email: string, password: string, remember: boolean) {
    const user = await this.prisma.internalUser.findUnique({ where: { email } });
    if (!user || !user.activo) throw new UnauthorizedException();
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      throw new UnauthorizedException();
    }
    const session = await this.sessions.create('internal_user', user.id, remember);
    return { session, user: { id: user.id, nombre: user.nombre, rol: user.rol } };
  }

  // Login unificado: detecta si el correo es de un usuario interno, comercio o estudiante,
  // crea la sesión polimórfica correspondiente y devuelve a dónde redirigir.
  async loginUniversal(email: string, password: string, remember: boolean) {
    const iu = await this.prisma.internalUser.findUnique({ where: { email } });
    if (iu && iu.activo && (await this.passwords.verify(iu.passwordHash, password))) {
      const session = await this.sessions.create('internal_user', iu.id, remember);
      return { session, tipo: 'internal_user' as const, redirect: '/panel' };
    }
    const c = await this.prisma.commerce.findUnique({ where: { email } });
    if (c && c.activo && (await this.passwords.verify(c.passwordHash, password))) {
      const session = await this.sessions.create('commerce', c.id, remember);
      return { session, tipo: 'commerce' as const, redirect: '/comercio/validar' };
    }
    const s = await this.prisma.student.findUnique({ where: { correo: email } });
    if (s && (await this.passwords.verify(s.passwordHash, password))) {
      const session = await this.sessions.create('student', s.id, remember);
      return { session, tipo: 'student' as const, redirect: '/perfil' };
    }
    throw new UnauthorizedException();
  }

  logout(sessionId: string) {
    return this.sessions.destroy(sessionId);
  }
}
