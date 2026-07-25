import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Exclude = { type: 'internal' | 'commerce' | 'student'; id: string };

// Verifica que el correo no exista en NINGÚN tipo de usuario (interno, comercio, estudiante).
// El correo es único en todo el padrón. `exclude` permite ignorar el propio registro al editar.
export async function assertEmailAvailable(prisma: PrismaService, email: string, exclude?: Exclude): Promise<void> {
  const [iu, c, s] = await Promise.all([
    prisma.internalUser.findUnique({ where: { email }, select: { id: true } }),
    prisma.commerce.findUnique({ where: { email }, select: { id: true } }),
    prisma.student.findUnique({ where: { correo: email }, select: { id: true } }),
  ]);
  const taken =
    (!!iu && !(exclude?.type === 'internal' && exclude.id === iu.id)) ||
    (!!c && !(exclude?.type === 'commerce' && exclude.id === c.id)) ||
    (!!s && !(exclude?.type === 'student' && exclude.id === s.id));
  if (taken) throw new ConflictException('El correo ya está en uso');
}
