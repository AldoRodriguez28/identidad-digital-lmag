import { edadFrom } from './edad';

describe('edadFrom', () => {
  it('calcula años cumplidos', () => {
    const now = new Date('2026-07-21');
    expect(edadFrom(new Date('2005-07-21'), now)).toBe(21);
    expect(edadFrom(new Date('2005-07-22'), now)).toBe(20); // aún no cumple
    expect(edadFrom(new Date('2000-01-01'), now)).toBe(26);
  });

  it('borde: cumpleaños falta un día (mes posterior, día siguiente)', () => {
    // Nacido el 2005-08-01; hoy es 2026-07-31 → aún no ha cumplido 21 → debe ser 20
    expect(edadFrom(new Date('2005-08-01'), new Date('2026-07-31'))).toBe(20);
  });
});
