import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [estudiantes, internos, comercios, grouped] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.internalUser.count(),
      this.prisma.commerce.count(),
      this.prisma.studentInterest.groupBy({
        by: ['interestId'],
        _count: { interestId: true },
        orderBy: { _count: { interestId: 'desc' } },
        take: 5,
      }),
    ]);
    const interests = await this.prisma.interest.findMany({
      where: { id: { in: grouped.map((g) => g.interestId) } },
      select: { id: true, nombre: true },
    });
    const nameById = new Map(interests.map((i) => [i.id, i.nombre]));
    const topIntereses = grouped.map((g) => ({
      nombre: nameById.get(g.interestId) ?? '—',
      count: g._count.interestId,
    }));
    return { usuarios: { estudiantes, internos, comercios }, topIntereses };
  }
}
