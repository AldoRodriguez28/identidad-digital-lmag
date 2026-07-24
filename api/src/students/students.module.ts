import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { PointsModule } from '../points/points.module';
import { StudentsController } from './students.controller';
import { CredentialController } from './credential.controller';
import { StudentsService } from './students.service';
import { StudentGuard } from './student.guard';

@Module({
  imports: [AuthModule, StorageModule, PointsModule],
  controllers: [StudentsController, CredentialController],
  providers: [StudentsService, StudentGuard],
  exports: [StudentsService],
})
export class StudentsModule {}
