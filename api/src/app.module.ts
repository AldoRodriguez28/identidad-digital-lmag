import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Controller()
class HealthController {
  @Get('health')
  health() { return { status: 'ok' }; }
}

@Module({ imports: [PrismaModule, AuthModule], controllers: [HealthController] })
export class AppModule {}
