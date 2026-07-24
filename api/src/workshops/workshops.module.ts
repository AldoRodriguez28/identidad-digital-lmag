import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkshopsService } from './workshops.service';
import { WorkshopsAdminController } from './workshops-admin.controller';
import { WorkshopsController } from './workshops.controller';

@Module({
  imports: [AuthModule],
  controllers: [WorkshopsAdminController, WorkshopsController],
  providers: [WorkshopsService],
})
export class WorkshopsModule {}
