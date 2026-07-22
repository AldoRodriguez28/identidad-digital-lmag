import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';
import { CommerceGuard } from './commerce.guard';

@Module({
  imports: [AuthModule],
  controllers: [CommerceController],
  providers: [CommerceService, CommerceGuard],
  exports: [CommerceService, CommerceGuard],
})
export class CommerceModule {}
