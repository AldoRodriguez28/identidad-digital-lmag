import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessions: SessionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved) throw new UnauthorizedException();
    req.user = resolved.user;
    return true;
  }
}
