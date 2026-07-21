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
    const session = await this.sessions.create(user.id, remember);
    return { session, user: { id: user.id, nombre: user.nombre, rol: user.rol } };
  }

  logout(sessionId: string) {
    return this.sessions.destroy(sessionId);
  }
}
