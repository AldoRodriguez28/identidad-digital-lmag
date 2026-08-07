import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriaInteres } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { decryptIne } from '../common/ine-crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

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
      select: { id: true, nombre: true, categoria: true },
    });
    const byId = new Map(interests.map((i) => [i.id, i]));
    const topIntereses = grouped.map((g) => ({
      nombre: byId.get(g.interestId)?.nombre ?? '—',
      categoria: byId.get(g.interestId)?.categoria ?? null,
      count: g._count.interestId,
    }));
    return { usuarios: { estudiantes, internos, comercios }, topIntereses };
  }

  async listStudents(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        select: { id: true, nombreCompleto: true, correo: true, curp: true, telefono: true, nivel: true, puntosAcumulados: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.student.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async getStudent(id: string) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        nombreCompleto: true,
        fechaNacimiento: true,
        curp: true,
        sexo: true,
        escolaridad: true,
        anioVigenciaCredencial: true,
        correo: true,
        telefono: true,
        calle: true,
        colonia: true,
        codigoPostal: true,
        numExt: true,
        numInt: true,
        entreCalles: true,
        facebook: true,
        instagram: true,
        tiktok: true,
        whatsapp: true,
        nivel: true,
        puntosAcumulados: true,
        credentialToken: true,
        createdAt: true,
        // Only for presence check — not forwarded to caller
        ineFrente: true,
        ineReverso: true,
        interests: { select: { interest: { select: { id: true, nombre: true } } } },
      },
    });
    if (!s) throw new NotFoundException();
    const { ineFrente, ineReverso, interests, ...rest } = s;
    return {
      ...rest,
      interests: interests.map((si) => si.interest),
      ine: { frente: !!ineFrente, reverso: !!ineReverso },
    };
  }

  async deleteStudent(id: string) {
    const existing = await this.prisma.student.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.student.delete({ where: { id } });
  }

  async createInterest(nombre: string, categoria?: CategoriaInteres) {
    const dup = await this.prisma.interest.findUnique({ where: { nombre }, select: { id: true } });
    if (dup) throw new ConflictException('El interés ya existe');
    return this.prisma.interest.create({
      data: { nombre, ...(categoria ? { categoria } : {}) },
      select: { id: true, nombre: true, categoria: true },
    });
  }

  async updateInterest(id: string, nombre: string, categoria?: CategoriaInteres) {
    const existing = await this.prisma.interest.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    const dup = await this.prisma.interest.findUnique({ where: { nombre }, select: { id: true } });
    if (dup && dup.id !== id) throw new ConflictException('El interés ya existe');
    return this.prisma.interest.update({
      where: { id },
      data: { nombre, ...(categoria ? { categoria } : {}) },
      select: { id: true, nombre: true, categoria: true },
    });
  }

  async deleteInterest(id: string) {
    const existing = await this.prisma.interest.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException();
    await this.prisma.interest.delete({ where: { id } });
  }

  async getIneFile(id: string, side: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (side !== 'frente' && side !== 'reverso') throw new BadRequestException('side inválido');
    const s = await this.prisma.student.findUnique({
      where: { id }, select: { ineFrente: true, ineReverso: true },
    });
    const key = side === 'frente' ? s?.ineFrente : s?.ineReverso;
    if (!key) throw new NotFoundException();
    const contentType = key.endsWith('.png') ? 'image/png' : key.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    const sealed = await this.storage.get(key);
    return { buffer: decryptIne(sealed), contentType };
  }
}
