import { Injectable } from '@nestjs/common';
import { Prisma, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { nivelForPuntos, progresoNivel } from '../students/nivel';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  // Otorga puntos DENTRO de una transacción (tx) para componer con otras escrituras (p. ej. el check-in).
  async award(
    tx: Prisma.TransactionClient,
    studentId: string,
    tipo: TipoMovimiento,
    referencia: string | null,
    puntos: number,
  ) {
    const student = await tx.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { puntosAcumulados: true },
    });
    const nuevoTotal = student.puntosAcumulados + puntos;
    await tx.pointsMovement.create({ data: { studentId, tipo, referencia, puntos } });
    return tx.student.update({
      where: { id: studentId },
      data: { puntosAcumulados: nuevoTotal, nivel: nivelForPuntos(nuevoTotal) },
    });
  }

  async getSummary(studentId: string) {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { puntosAcumulados: true, nivel: true },
    });
    const movimientos = await this.prisma.pointsMovement.findMany({
      where: { studentId },
      select: { id: true, tipo: true, referencia: true, puntos: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const eventosAsistidos = await this.prisma.eventCheckin.count({ where: { studentId } });
    const prog = progresoNivel(student.puntosAcumulados);
    return {
      puntosAcumulados: student.puntosAcumulados,
      nivel: student.nivel,
      siguiente: prog.siguiente,
      puntosParaSiguiente: prog.puntosParaSiguiente,
      porcentaje: prog.porcentaje,
      eventosAsistidos,
      movimientos,
    };
  }
}
