import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hash produce un valor distinto al texto plano', async () => {
    const h = await svc.hash('secreto123');
    expect(h).not.toBe('secreto123');
    expect(h.length).toBeGreaterThan(20);
  });

  it('verify true para la contraseña correcta y false para la incorrecta', async () => {
    const h = await svc.hash('secreto123');
    expect(await svc.verify(h, 'secreto123')).toBe(true);
    expect(await svc.verify(h, 'otra')).toBe(false);
  });
});
