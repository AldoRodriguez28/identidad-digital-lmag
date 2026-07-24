import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

const PUBLIC = { id: true, titulo: true, descripcion: true, categoria: true, fecha: true, lugar: true, puntosOtorgados: true } as const;

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService, private points: PointsService) {}

  listAdmin() {
    return this.prisma.event.findMany({ orderBy: { fecha: 'desc' } });
  }

  listPublic() {
    return this.prisma.event.findMany({ where: { activo: true }, select: PUBLIC, orderBy: { fecha: 'asc' } });
  }

  create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        titulo: dto.titulo, descripcion: dto.descripcion, categoria: dto.categoria,
        fecha: new Date(dto.fecha), lugar: dto.lugar, puntosOtorgados: dto.puntosOtorgados,
        activo: dto.activo ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    const data: Prisma.EventUpdateInput = { ...dto };
    if (dto.fecha) data.fecha = new Date(dto.fecha);
    return this.prisma.event.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.event.delete({ where: { id } });
  }

  // Usada por el endpoint de check-in (Task 3). Atómica: crea el check-in y otorga puntos.
  async checkin(eventId: string, credentialToken: string, otorgadoPor: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.activo) throw new NotFoundException('Evento no encontrado o inactivo');
    const student = await this.prisma.student.findUnique({
      where: { credentialToken },
      select: { id: true, nombreCompleto: true },
    });
    if (!student) throw new NotFoundException('Credencial no encontrada');

    const ya = await this.prisma.eventCheckin.findUnique({
      where: { eventId_studentId: { eventId, studentId: student.id } },
      select: { id: true },
    });
    if (ya) throw new ConflictException('Este joven ya hizo check-in en este evento');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.eventCheckin.create({ data: { eventId, studentId: student.id, otorgadoPor } });
      return this.points.award(tx, student.id, 'evento', eventId, event.puntosOtorgados);
    });

    return {
      student: { nombreCompleto: student.nombreCompleto, nivel: updated.nivel },
      puntosOtorgados: event.puntosOtorgados,
      puntosAcumulados: updated.puntosAcumulados,
    };
  }
}
