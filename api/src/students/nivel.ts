import { Nivel } from '@prisma/client';

export function nivelForPuntos(puntos: number): Nivel {
  if (puntos <= 500) return 'bronce';
  if (puntos <= 1500) return 'plata';
  if (puntos <= 3000) return 'oro';
  return 'diamante';
}

function tramo(puntos: number, piso: number, techo: number, siguiente: Nivel) {
  return {
    nivel: nivelForPuntos(puntos),
    siguiente,
    puntosParaSiguiente: techo - puntos,
    porcentaje: Math.round(((puntos - piso) / (techo - piso)) * 100),
  };
}

export function progresoNivel(puntos: number): {
  nivel: Nivel; siguiente: Nivel | null; puntosParaSiguiente: number; porcentaje: number;
} {
  const nivel = nivelForPuntos(puntos);
  if (nivel === 'bronce') return tramo(puntos, 0, 501, 'plata');
  if (nivel === 'plata') return tramo(puntos, 501, 1501, 'oro');
  if (nivel === 'oro') return tramo(puntos, 1501, 3001, 'diamante');
  return { nivel: 'diamante', siguiente: null, puntosParaSiguiente: 0, porcentaje: 100 };
}
