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

  // Consulta la credencial (al escanear): devuelve el joven y el % de descuento. NO registra nada.
  async validate(commerceId: string, porcentajeDescuento: number, credentialToken: string) {
    const student = await this.prisma.student.findUnique({
      where: { credentialToken },
      select: { id: true, nombreCompleto: true, nivel: true },
    });
    if (!student) throw new NotFoundException('Credencial no encontrada');
    return {
      student: { nombreCompleto: student.nombreCompleto, nivel: student.nivel },
      porcentajeDescuento,
    };
  }

  // Registra la compra con el monto capturado; guarda el descuento aplicado.
  async registerPurchase(commerceId: string, porcentajeDescuento: number, credentialToken: string, monto: number) {
    const student = await this.prisma.student.findUnique({
      where: { credentialToken },
      select: { id: true, nombreCompleto: true, nivel: true },
    });
    if (!student) throw new NotFoundException('Credencial no encontrada');
    await this.prisma.benefitUsage.create({ data: { commerceId, studentId: student.id, monto, porcentajeDescuento } });
    const descuento = Math.round(monto * porcentajeDescuento) / 100;
    return {
      student: { nombreCompleto: student.nombreCompleto, nivel: student.nivel },
      monto,
      porcentajeDescuento,
      descuento,
      montoFinal: Math.round((monto - descuento) * 100) / 100,
    };
  }

  // Visitas/compras registradas de este comercio, con filtro opcional por rango de fechas.
  async listUsages(commerceId: string, from?: string, to?: string) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (from) createdAt.gte = new Date(from);
    if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); createdAt.lte = t; }
    const usages = await this.prisma.benefitUsage.findMany({
      where: { commerceId, ...(from || to ? { createdAt } : {}) },
      select: { id: true, createdAt: true, monto: true, porcentajeDescuento: true, student: { select: { nombreCompleto: true, nivel: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const usos = usages.map((u) => {
      const descuento = u.monto != null && u.porcentajeDescuento != null ? Math.round(u.monto * u.porcentajeDescuento) / 100 : null;
      return {
        id: u.id, fecha: u.createdAt, estudiante: u.student.nombreCompleto, nivel: u.student.nivel,
        monto: u.monto, porcentajeDescuento: u.porcentajeDescuento, descuento,
      };
    });
    const totalMonto = Math.round(usos.reduce((a, u) => a + (u.monto ?? 0), 0) * 100) / 100;
    const totalDescuento = Math.round(usos.reduce((a, u) => a + (u.descuento ?? 0), 0) * 100) / 100;
    return { total: usos.length, totalMonto, totalDescuento, usos };
  }

  listBenefits() {
    return this.prisma.commerce.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, descripcion: true, porcentajeDescuento: true, logo: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
