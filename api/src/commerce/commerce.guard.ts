import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../auth/session.service';

@Injectable()
export class CommerceGuard implements CanActivate {
  constructor(private sessions: SessionService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved || resolved.principalType !== 'commerce') throw new UnauthorizedException();
    const commerce = await this.prisma.commerce.findUnique({ where: { id: resolved.principalId } });
    if (!commerce || !commerce.activo) throw new UnauthorizedException();
    req.commerce = commerce;
    return true;
  }
}
