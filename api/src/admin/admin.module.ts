import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { DashboardController } from './dashboard.controller';
import { StudentsAdminController } from './students-admin.controller';
import { InterestsAdminController } from './interests-admin.controller';
import { InternalUsersController } from './internal-users.controller';
import { InternalUsersService } from './internal-users.service';
import { CommercesAdminController } from './commerces-admin.controller';
import { CommercesAdminService } from './commerces-admin.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, StudentsAdminController, InterestsAdminController, InternalUsersController, CommercesAdminController, ProfileController],
  providers: [AdminService, InternalUsersService, CommercesAdminService, ProfileService],
  exports: [AdminService],
})
export class AdminModule {}
