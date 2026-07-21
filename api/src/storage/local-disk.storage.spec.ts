import { existsSync, readFileSync, rmSync } from 'fs';
import { LocalDiskStorage } from './local-disk.storage';

describe('LocalDiskStorage', () => {
  const dir = 'var/storage-test';
  const storage = new LocalDiskStorage(dir);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('put guarda el archivo y devuelve una key con extensión por contentType', async () => {
    const key = await storage.put(Buffer.from('hola'), 'image/png');
    expect(key).toMatch(/\.png$/);
    const path = storage.getPath(key);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path).toString()).toBe('hola');
  });

  it('usa jpg para image/jpeg y bin para desconocido', async () => {
    expect(await storage.put(Buffer.from('a'), 'image/jpeg')).toMatch(/\.jpg$/);
    expect(await storage.put(Buffer.from('a'), 'application/x-foo')).toMatch(/\.bin$/);
  });
});
