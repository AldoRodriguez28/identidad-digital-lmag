import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
