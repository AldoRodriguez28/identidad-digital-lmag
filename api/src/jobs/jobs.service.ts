import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

const PUBLIC = { id: true, puesto: true, empresa: true, requisitos: true, contacto: true } as const;

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.jobPosting.findMany({ orderBy: { createdAt: 'desc' } });
  }

  listPublic() {
    return this.prisma.jobPosting.findMany({ where: { activo: true }, select: PUBLIC, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateJobDto) {
    return this.prisma.jobPosting.create({
      data: {
        puesto: dto.puesto, empresa: dto.empresa, requisitos: dto.requisitos,
        contacto: dto.contacto, activo: dto.activo ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateJobDto) {
    const existing = await this.prisma.jobPosting.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.jobPosting.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const existing = await this.prisma.jobPosting.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.jobPosting.delete({ where: { id } });
  }
}
