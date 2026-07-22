import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, SessionGuard, RolesGuard],
  exports: [PasswordService, SessionService, SessionGuard, RolesGuard],
})
export class AuthModule {}
