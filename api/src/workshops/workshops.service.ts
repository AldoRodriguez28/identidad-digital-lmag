import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/workshop.dto';

const PUBLIC = { id: true, titulo: true, descripcion: true, precio: true, horario: true, modalidad: true } as const;

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.workshop.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listPublic() {
    return this.prisma.workshop.findMany({ where: { activo: true }, select: PUBLIC, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateWorkshopDto) {
    return this.prisma.workshop.create({
      data: {
        titulo: dto.titulo, descripcion: dto.descripcion, precio: dto.precio,
        horario: dto.horario, modalidad: dto.modalidad, activo: dto.activo ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateWorkshopDto) {
    const existing = await this.prisma.workshop.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.workshop.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const existing = await this.prisma.workshop.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.workshop.delete({ where: { id } });
  }
}
