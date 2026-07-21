import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../auth/session.service';

@Injectable()
export class StudentGuard implements CanActivate {
  constructor(private sessions: SessionService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'idsid';
    const sid = req.cookies?.[cookieName];
    if (!sid) throw new UnauthorizedException();
    const resolved = await this.sessions.resolve(sid);
    if (!resolved || resolved.principalType !== 'student') throw new UnauthorizedException();
    const student = await this.prisma.student.findUnique({ where: { id: resolved.principalId } });
    if (!student) throw new UnauthorizedException();
    req.student = student;
    return true;
  }
}
