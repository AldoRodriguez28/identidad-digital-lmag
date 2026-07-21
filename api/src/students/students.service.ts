import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { RegisterStudentDto } from './dto/register-student.dto';

export type StudentPublicView = {
  id: string; nombreCompleto: string; correo: string;
  nivel: string; puntosAcumulados: number; credentialToken: string;
};

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private passwords: PasswordService) {}

  toPublicView(s: Student): StudentPublicView {
    return {
      id: s.id, nombreCompleto: s.nombreCompleto, correo: s.correo,
      nivel: s.nivel, puntosAcumulados: s.puntosAcumulados, credentialToken: s.credentialToken,
    };
  }

  async register(dto: RegisterStudentDto): Promise<StudentPublicView> {
    const existing = await this.prisma.student.findFirst({
      where: { OR: [{ correo: dto.correo }, { curp: dto.curp }] },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Correo o CURP ya registrado');

    const passwordHash = await this.passwords.hash(dto.password);
    const credentialToken = randomBytes(16).toString('base64url');
    const { password, interestIds, fechaNacimiento, ...rest } = dto;

    const student = await this.prisma.student.create({
      data: {
        ...rest,
        fechaNacimiento: new Date(fechaNacimiento),
        passwordHash,
        credentialToken,
        interests: interestIds?.length
          ? { create: interestIds.map((interestId) => ({ interestId })) }
          : undefined,
      },
    });
    return this.toPublicView(student);
  }
}
