import { Nivel } from '@prisma/client';

export function nivelForPuntos(puntos: number): Nivel {
  if (puntos <= 500) return 'bronce';
  if (puntos <= 1500) return 'plata';
  if (puntos <= 3000) return 'oro';
  return 'diamante';
}
