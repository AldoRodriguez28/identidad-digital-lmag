import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { DashboardController } from './dashboard.controller';
import { StudentsAdminController } from './students-admin.controller';
import { InterestsAdminController } from './interests-admin.controller';
import { InternalUsersController } from './internal-users.controller';
import { InternalUsersService } from './internal-users.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, StudentsAdminController, InterestsAdminController, InternalUsersController],
  providers: [AdminService, InternalUsersService],
  exports: [AdminService],
})
export class AdminModule {}
