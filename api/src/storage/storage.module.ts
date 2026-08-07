import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalDiskStorage } from './local-disk.storage';
import { R2Storage } from './r2.storage';

function buildR2Storage(): R2Storage {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const missing = [
    ['R2_ENDPOINT', endpoint], ['R2_ACCESS_KEY_ID', accessKeyId],
    ['R2_SECRET_ACCESS_KEY', secretAccessKey], ['R2_BUCKET', bucket],
  ].filter(([, v]) => !v).map(([name]) => name);
  if (missing.length) {
    throw new Error(`STORAGE_DRIVER=r2 requiere ${missing.join(', ')} — ver .env.example.`);
  }
  return new R2Storage({ endpoint: endpoint!, accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!, bucket: bucket! });
}

function buildStorage(): StorageService {
  return process.env.STORAGE_DRIVER === 'r2' ? buildR2Storage() : new LocalDiskStorage();
}

@Global()
@Module({
  providers: [{ provide: StorageService, useFactory: buildStorage }],
  exports: [StorageService],
})
export class StorageModule {}
