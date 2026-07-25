import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InterestsService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.interest.findMany({
      select: { id: true, nombre: true, categoria: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
