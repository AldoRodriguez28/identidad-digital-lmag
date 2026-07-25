import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecursoDto, UpdateRecursoDto, RecursoTipo } from './dto/recurso.dto';

const PUBLIC = { id: true, tipo: true, titulo: true, categoria: true, descripcion: true, contacto: true } as const;

@Injectable()
export class RecursosService {
  constructor(private prisma: PrismaService) {}

  listAdmin(tipo?: RecursoTipo) {
    return this.prisma.recurso.findMany({ where: tipo ? { tipo } : {}, orderBy: { createdAt: 'desc' } });
  }

  listPublic(tipo?: RecursoTipo) {
    return this.prisma.recurso.findMany({
      where: { activo: true, ...(tipo ? { tipo } : {}) },
      select: PUBLIC,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateRecursoDto) {
    return this.prisma.recurso.create({
      data: {
        tipo: dto.tipo, titulo: dto.titulo, categoria: dto.categoria,
        descripcion: dto.descripcion, contacto: dto.contacto, activo: dto.activo ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateRecursoDto) {
    const existing = await this.prisma.recurso.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.recurso.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const existing = await this.prisma.recurso.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.recurso.delete({ where: { id } });
  }
}
