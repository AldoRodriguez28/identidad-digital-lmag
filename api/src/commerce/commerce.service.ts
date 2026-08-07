import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Commerce } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { PointsService } from '../points/points.service';
import { StorageService } from '../storage/storage.service';
import { assertEmailAvailable } from '../common/email-availability';

export type CommercePublicView = { id: string; nombre: string; porcentajeDescuento: number };

const PROFILE_VIEW = {
  id: true, nombre: true, descripcion: true, email: true, porcentajeDescuento: true, logo: true, activo: true,
} as const;

// Puntos por compra en comercio: 1 punto por cada $20 gastados, con topes anti-fraude.
const PESOS_POR_PUNTO = 20;
const PUNTOS_MAX_POR_COMPRA = 100;
const PUNTOS_MAX_POR_DIA = 150;
const COOLDOWN_MS = 60_000; // evita doble registro accidental del mismo cliente en el mismo comercio

@Injectable()
export class CommerceService {
  constructor(
    private prisma: PrismaService,
    private passwords: PasswordService,
    private sessions: SessionService,
    private points: PointsService,
    private storage: StorageService,
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

  // Registra la compra con el monto capturado; guarda el descuento aplicado y otorga puntos por la compra.
  async registerPurchase(commerceId: string, porcentajeDescuento: number, credentialToken: string, monto: number) {
    const student = await this.prisma.student.findUnique({
      where: { credentialToken },
      select: { id: true, nombreCompleto: true, nivel: true, puntosAcumulados: true },
    });
    if (!student) throw new NotFoundException('Credencial no encontrada');

    const reciente = await this.prisma.benefitUsage.findFirst({
      where: { commerceId, studentId: student.id, createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) } },
      select: { id: true },
    });
    if (reciente) throw new ConflictException('Ya se registró una compra de este cliente hace unos segundos. Espera un momento antes de volver a registrar.');

    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const { updated, puntosOtorgados } = await this.prisma.$transaction(async (tx) => {
      await tx.benefitUsage.create({ data: { commerceId, studentId: student.id, monto, porcentajeDescuento } });

      const { _sum } = await tx.pointsMovement.aggregate({
        where: { studentId: student.id, tipo: 'compra_comercio', createdAt: { gte: inicioDelDia } },
        _sum: { puntos: true },
      });
      const puntosHoy = _sum.puntos ?? 0;
      const disponibleHoy = Math.max(0, PUNTOS_MAX_POR_DIA - puntosHoy);
      const puntos = Math.min(Math.floor(monto / PESOS_POR_PUNTO), PUNTOS_MAX_POR_COMPRA, disponibleHoy);

      if (puntos > 0) {
        const s = await this.points.award(tx, student.id, 'compra_comercio', commerceId, puntos);
        return { updated: s, puntosOtorgados: puntos };
      }
      return { updated: student, puntosOtorgados: 0 };
    });

    const descuento = Math.round(monto * porcentajeDescuento) / 100;
    return {
      student: { nombreCompleto: student.nombreCompleto, nivel: updated.nivel },
      monto,
      porcentajeDescuento,
      descuento,
      montoFinal: Math.round((monto - descuento) * 100) / 100,
      puntosOtorgados,
      puntosAcumulados: updated.puntosAcumulados,
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

  getProfile(id: string) {
    return this.prisma.commerce.findUniqueOrThrow({ where: { id }, select: PROFILE_VIEW });
  }

  async updateProfile(id: string, data: { nombre?: string; descripcion?: string; email?: string }) {
    if (data.email) {
      await assertEmailAvailable(this.prisma, data.email, { type: 'commerce', id });
    }
    return this.prisma.commerce.update({ where: { id }, data, select: PROFILE_VIEW });
  }

  async changePassword(id: string, current: string, next: string) {
    const commerce = await this.prisma.commerce.findUniqueOrThrow({ where: { id } });
    if (!(await this.passwords.verify(commerce.passwordHash, current))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    const passwordHash = await this.passwords.hash(next);
    await this.prisma.commerce.update({ where: { id }, data: { passwordHash } });
  }

  async uploadLogo(id: string, buffer: Buffer, contentType: string) {
    const logo = await this.storage.put(buffer, contentType);
    await this.prisma.commerce.update({ where: { id }, data: { logo } });
    return { logo };
  }

  async getLogoFile(id: string) {
    const c = await this.prisma.commerce.findUnique({ where: { id }, select: { logo: true } });
    if (!c?.logo) throw new NotFoundException();
    const contentType = c.logo.endsWith('.png') ? 'image/png' : c.logo.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    const buffer = await this.storage.get(c.logo);
    return { buffer, contentType };
  }
}
