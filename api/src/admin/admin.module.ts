import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { DashboardController } from './dashboard.controller';
import { StudentsAdminController } from './students-admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, StudentsAdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
