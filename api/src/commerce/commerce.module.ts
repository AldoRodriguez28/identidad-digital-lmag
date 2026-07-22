import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommerceController } from './commerce.controller';
import { BenefitsController } from './benefits.controller';
import { CommerceService } from './commerce.service';
import { CommerceGuard } from './commerce.guard';

@Module({
  imports: [AuthModule],
  controllers: [CommerceController, BenefitsController],
  providers: [CommerceService, CommerceGuard],
  exports: [CommerceService, CommerceGuard],
})
export class CommerceModule {}
