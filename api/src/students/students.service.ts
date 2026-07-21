import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';
import { edadFrom } from './edad';
import { RegisterStudentDto } from './dto/register-student.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type StudentPublicView = {
  id: string; nombreCompleto: string; correo: string;
  nivel: string; puntosAcumulados: number; credentialToken: string;
};

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private passwords: PasswordService,
    private sessions: SessionService,
    private storage: StorageService,
    private email: EmailService,
  ) {}

  private async assertInterestsExist(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const uniqueIds = [...new Set(ids)];
    const found = await this.prisma.interest.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (found.length !== uniqueIds.length) {
      throw new BadRequestException('Uno o más intereses no existen');
    }
  }

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

    if (dto.interestIds?.length) {
      await this.assertInterestsExist(dto.interestIds);
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const credentialToken = randomBytes(16).toString('base64url');
    const { password, interestIds, fechaNacimiento, ...rest } = dto;

    try {
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
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Correo o CURP ya registrado');
      }
      throw err;
    }
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

    if (interestIds?.length) {
      await this.assertInterestsExist(interestIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: studentId }, data: fields });
      if (interestIds) {
        await tx.studentInterest.deleteMany({ where: { studentId } });
        if (interestIds.length) {
          await tx.studentInterest.createMany({
            data: interestIds.map((interestId) => ({ studentId, interestId })),
          });
        }
      }
    });

    return this.buildProfile(studentId);
  }

  async saveIne(
    studentId: string,
    frente: Buffer,
    frenteType: string,
    reverso: Buffer,
    reversoType: string,
  ) {
    const ineFrente = await this.storage.put(frente, frenteType);
    const ineReverso = await this.storage.put(reverso, reversoType);
    await this.prisma.student.update({ where: { id: studentId }, data: { ineFrente, ineReverso } });
    return { ok: true as const };
  }

  async getCredentialByToken(token: string) {
    const s = await this.prisma.student.findUnique({
      where: { credentialToken: token },
      include: { interests: { include: { interest: { select: { nombre: true } } } } },
    });
    if (!s) throw new NotFoundException();
    return {
      nombreCompleto: s.nombreCompleto,
      nivel: s.nivel,
      edad: edadFrom(s.fechaNacimiento),
      escolaridad: s.escolaridad,
      colonia: s.colonia,
      intereses: s.interests.map((si) => si.interest.nombre),
      redes: { facebook: s.facebook, instagram: s.instagram, tiktok: s.tiktok, whatsapp: s.whatsapp },
    };
  }

  async requestReset(correo: string): Promise<void> {
    const student = await this.prisma.student.findUnique({ where: { correo } });
    if (!student) return;
    // Invalidate any prior unused tokens so only one active token exists per student
    await this.prisma.passwordReset.updateMany({
      where: { studentId: student.id, used: false },
      data: { used: true },
    });
    const token = randomBytes(24).toString('base64url');
    await this.prisma.passwordReset.create({
      data: { studentId: student.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const link = `${process.env.WEB_URL ?? 'http://localhost:3000'}/recuperar/${token}`;
    try {
      await this.email.send(correo, 'Recupera tu contraseña', `Abre este enlace para restablecerla: ${link}`);
    } catch (err) {
      // Email provider failure must not leak information about account existence
      // or break the always-201 contract — log and swallow
      console.error('[requestReset] Email send failed:', err);
    }
  }
}
