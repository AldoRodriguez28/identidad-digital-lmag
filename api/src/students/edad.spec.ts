import { edadFrom } from './edad';

describe('edadFrom', () => {
  it('calcula años cumplidos', () => {
    const now = new Date('2026-07-21');
    expect(edadFrom(new Date('2005-07-21'), now)).toBe(21);
    expect(edadFrom(new Date('2005-07-22'), now)).toBe(20); // aún no cumple
    expect(edadFrom(new Date('2000-01-01'), now)).toBe(26);
  });
});
