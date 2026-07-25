import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { assertEmailAvailable } from '../common/email-availability';

const VIEW = { id: true, nombre: true, descripcion: true, porcentajeDescuento: true, email: true, activo: true, createdAt: true } as const;

@Injectable()
export class CommercesAdminService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  list() {
    return this.prisma.commerce.findMany({ select: VIEW, orderBy: { nombre: 'asc' } });
  }

  async create(nombre: string, descripcion: string | undefined, porcentajeDescuento: number, email: string, password: string) {
    await assertEmailAvailable(this.prisma, email);
    const passwordHash = await this.passwords.hash(password);
    return this.prisma.commerce.create({ data: { nombre, descripcion, porcentajeDescuento, email, passwordHash }, select: VIEW });
  }

  async update(id: string, data: { nombre?: string; descripcion?: string; porcentajeDescuento?: number; activo?: boolean }) {
    const existing = await this.prisma.commerce.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.commerce.update({ where: { id }, data, select: VIEW });
  }

  async remove(id: string) {
    const existing = await this.prisma.commerce.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.commerce.delete({ where: { id } });
  }
}
