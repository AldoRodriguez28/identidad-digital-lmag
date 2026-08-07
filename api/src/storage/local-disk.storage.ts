import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { dirname } from 'path';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { isAbsolute, join } from 'path';
import { StorageService } from './storage.service';

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' };

@Injectable()
export class LocalDiskStorage extends StorageService {
  private readonly dir: string;
  constructor(dir = process.env.STORAGE_DIR ?? 'var/storage') {
    super();
    this.dir = isAbsolute(dir) ? dir : join(process.cwd(), dir);
    mkdirSync(this.dir, { recursive: true });
  }
  put(buffer: Buffer, contentType: string, folder?: string): Promise<string> {
    const ext = EXT[contentType] ?? 'bin';
    const random = randomBytes(12).toString('base64url');
    const key = folder ? `${folder}-${random}.${ext}` : `${random}.${ext}`;
    const path = this.getPath(key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, buffer);
    return Promise.resolve(key);
  }
  get(key: string): Promise<Buffer> {
    return Promise.resolve(readFileSync(this.getPath(key)));
  }
  getPath(key: string): string {
    return join(this.dir, key);
  }
}
