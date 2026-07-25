import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { assertEmailAvailable } from '../common/email-availability';

const VIEW = { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true } as const;

@Injectable()
export class InternalUsersService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  list() {
    return this.prisma.internalUser.findMany({ select: VIEW, orderBy: { createdAt: 'desc' } });
  }

  async create(email: string, nombre: string, rol: Rol, password: string) {
    await assertEmailAvailable(this.prisma, email);
    const passwordHash = await this.passwords.hash(password);
    return this.prisma.internalUser.create({ data: { email, nombre, rol, passwordHash }, select: VIEW });
  }

  async update(id: string, data: { nombre?: string; rol?: Rol; activo?: boolean }) {
    const existing = await this.prisma.internalUser.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    return this.prisma.internalUser.update({ where: { id }, data, select: VIEW });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException('No puedes eliminar tu propia cuenta');
    const existing = await this.prisma.internalUser.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.internalUser.delete({ where: { id } });
  }
}
