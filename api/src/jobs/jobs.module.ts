import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JobsService } from './jobs.service';
import { JobsAdminController } from './jobs-admin.controller';
import { JobsController } from './jobs.controller';

@Module({
  imports: [AuthModule],
  controllers: [JobsAdminController, JobsController],
  providers: [JobsService],
})
export class JobsModule {}
