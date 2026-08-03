import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PointsModule } from '../points/points.module';
import { StorageModule } from '../storage/storage.module';
import { CommerceController } from './commerce.controller';
import { BenefitsController } from './benefits.controller';
import { CommerceService } from './commerce.service';
import { CommerceGuard } from './commerce.guard';

@Module({
  imports: [AuthModule, PointsModule, StorageModule],
  controllers: [CommerceController, BenefitsController],
  providers: [CommerceService, CommerceGuard],
  exports: [CommerceService, CommerceGuard],
})
export class CommerceModule {}
