import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Commerce } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';

export type CommercePublicView = { id: string; nombre: string; porcentajeDescuento: number };

@Injectable()
export class CommerceService {
  constructor(
    private prisma: PrismaService,
    private passwords: PasswordService,
    private sessions: SessionService,
  ) {}

  toPublicView(c: Commerce): CommercePublicView {
    return { id: c.id, nombre: c.nombre, porcentajeDescuento: c.porcentajeDescuento };
  }

  async login(email: string, password: string, remember: boolean) {
    const commerce = await this.prisma.commerce.findUnique({ where: { email } });
    if (!commerce || !commerce.activo || !(await this.passwords.verify(commerce.passwordHash, password))) {
      throw new UnauthorizedException();
    }
    const session = await this.sessions.create('commerce', commerce.id, remember);
    return { session, view: this.toPublicView(commerce) };
  }

  logout(sessionId: string) {
    return this.sessions.destroy(sessionId);
  }

  async validate(commerceId: string, porcentajeDescuento: number, credentialToken: string) {
    const student = await this.prisma.student.findUnique({
      where: { credentialToken },
      select: { id: true, nombreCompleto: true, nivel: true },
    });
    if (!student) throw new NotFoundException('Credencial no encontrada');
    await this.prisma.benefitUsage.create({ data: { commerceId, studentId: student.id } });
    return {
      student: { nombreCompleto: student.nombreCompleto, nivel: student.nivel },
      porcentajeDescuento,
    };
  }

  listBenefits() {
    return this.prisma.commerce.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, descripcion: true, porcentajeDescuento: true, logo: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
