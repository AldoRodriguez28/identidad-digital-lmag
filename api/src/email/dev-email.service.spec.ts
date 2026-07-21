import { DevEmailService } from './dev-email.service';

describe('DevEmailService', () => {
  it('send loggea y resuelve sin lanzar', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const svc = new DevEmailService();
    await expect(svc.send('a@t.com', 'Asunto', 'cuerpo')).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
