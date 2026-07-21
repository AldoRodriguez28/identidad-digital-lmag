import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
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
  put(buffer: Buffer, contentType: string): Promise<string> {
    const ext = EXT[contentType] ?? 'bin';
    const key = `${randomBytes(12).toString('base64url')}.${ext}`;
    writeFileSync(this.getPath(key), buffer);
    return Promise.resolve(key);
  }
  getPath(key: string): string {
    return join(this.dir, key);
  }
}
