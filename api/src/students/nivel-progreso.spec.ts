import { progresoNivel } from './nivel';

describe('progresoNivel', () => {
  it('bronce: 0 pts → 0% hacia plata (501)', () => {
    const p = progresoNivel(0);
    expect(p.nivel).toBe('bronce');
    expect(p.siguiente).toBe('plata');
    expect(p.puntosParaSiguiente).toBe(501);
    expect(p.porcentaje).toBe(0);
  });

  it('plata: 1000 pts → ~50% hacia oro (1501)', () => {
    const p = progresoNivel(1000);
    expect(p.nivel).toBe('plata');
    expect(p.siguiente).toBe('oro');
    expect(p.puntosParaSiguiente).toBe(501);
    expect(p.porcentaje).toBe(50);
  });

  it('diamante: sin siguiente nivel, 100%', () => {
    const p = progresoNivel(5000);
    expect(p.nivel).toBe('diamante');
    expect(p.siguiente).toBeNull();
    expect(p.puntosParaSiguiente).toBe(0);
    expect(p.porcentaje).toBe(100);
  });
});
