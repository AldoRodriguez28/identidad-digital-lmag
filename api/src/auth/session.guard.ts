import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessions: SessionService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved || resolved.principalType !== 'internal_user') throw new UnauthorizedException();
    const user = await this.prisma.internalUser.findUnique({ where: { id: resolved.principalId } });
    if (!user || !user.activo) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}
