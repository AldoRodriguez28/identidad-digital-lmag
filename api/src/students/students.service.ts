import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type StudentPublicView = {
  id: string; nombreCompleto: string; correo: string;
  nivel: string; puntosAcumulados: number; credentialToken: string;
};

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private passwords: PasswordService, private sessions: SessionService) {}

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

  async login(correo: string, password: string, remember: boolean) {
    const student = await this.prisma.student.findUnique({ where: { correo } });
    if (!student || !(await this.passwords.verify(student.passwordHash, password))) {
      throw new UnauthorizedException();
    }
    const session = await this.sessions.create('student', student.id, remember);
    return { session, view: this.toPublicView(student) };
  }

  logout(sessionId: string) {
    return this.sessions.destroy(sessionId);
  }

  private async buildProfile(studentId: string) {
    const s = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { interests: { include: { interest: { select: { id: true, nombre: true } } } } },
    });
    return {
      ...this.toPublicView(s),
      telefono: s.telefono, escolaridad: s.escolaridad, calle: s.calle, colonia: s.colonia,
      codigoPostal: s.codigoPostal, numExt: s.numExt, numInt: s.numInt, entreCalles: s.entreCalles,
      facebook: s.facebook, instagram: s.instagram, tiktok: s.tiktok, whatsapp: s.whatsapp,
      interests: s.interests.map((si) => si.interest),
    };
  }

  getProfile(studentId: string) {
    return this.buildProfile(studentId);
  }

  async updateProfile(studentId: string, dto: UpdateProfileDto) {
    const { interestIds, ...fields } = dto;
    await this.prisma.student.update({ where: { id: studentId }, data: fields });
    if (interestIds) {
      await this.prisma.studentInterest.deleteMany({ where: { studentId } });
      if (interestIds.length) {
        await this.prisma.studentInterest.createMany({
          data: interestIds.map((interestId) => ({ studentId, interestId })),
        });
      }
    }
    return this.buildProfile(studentId);
  }
}
