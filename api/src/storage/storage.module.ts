import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalDiskStorage } from './local-disk.storage';

@Global()
@Module({
  providers: [{ provide: StorageService, useClass: LocalDiskStorage }],
  exports: [StorageService],
})
export class StorageModule {}
