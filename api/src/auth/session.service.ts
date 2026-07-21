import { Injectable } from '@nestjs/common';
import { PrincipalType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  create(principalType: PrincipalType, principalId: string, remember: boolean) {
    const ttl = remember ? 7 * DAY : DAY;
    return this.prisma.session.create({
      data: { principalType, principalId, remember, expiresAt: new Date(Date.now() + ttl) },
    });
  }

  async resolve(sessionId: string) {
    const s = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!s || s.expiresAt.getTime() < Date.now()) return null;
    return { principalType: s.principalType, principalId: s.principalId };
  }

  async destroy(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }
}
