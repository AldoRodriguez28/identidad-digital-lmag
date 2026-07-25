import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RecursosService } from './recursos.service';
import { RecursosController } from './recursos.controller';
import { RecursosAdminController } from './recursos-admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [RecursosAdminController, RecursosController],
  providers: [RecursosService],
})
export class RecursosModule {}
