import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

const VIEW = { id: true, email: true, nombre: true, rol: true } as const;

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  get(id: string) {
    return this.prisma.internalUser.findUniqueOrThrow({ where: { id }, select: VIEW });
  }

  async update(id: string, data: { nombre?: string; email?: string }) {
    if (data.email) {
      const dup = await this.prisma.internalUser.findUnique({ where: { email: data.email }, select: { id: true } });
      if (dup && dup.id !== id) throw new ConflictException('El correo ya está en uso');
    }
    return this.prisma.internalUser.update({ where: { id }, data, select: VIEW });
  }

  async changePassword(id: string, current: string, next: string) {
    const user = await this.prisma.internalUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    if (!(await this.passwords.verify(user.passwordHash, current))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    const passwordHash = await this.passwords.hash(next);
    await this.prisma.internalUser.update({ where: { id }, data: { passwordHash } });
  }
}
