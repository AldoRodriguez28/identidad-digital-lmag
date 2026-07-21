import { nivelForPuntos } from './nivel';

describe('nivelForPuntos', () => {
  it('mapea los umbrales de nivel', () => {
    expect(nivelForPuntos(0)).toBe('bronce');
    expect(nivelForPuntos(500)).toBe('bronce');
    expect(nivelForPuntos(501)).toBe('plata');
    expect(nivelForPuntos(1500)).toBe('plata');
    expect(nivelForPuntos(1501)).toBe('oro');
    expect(nivelForPuntos(3000)).toBe('oro');
    expect(nivelForPuntos(3001)).toBe('diamante');
    expect(nivelForPuntos(999999)).toBe('diamante');
  });
});
