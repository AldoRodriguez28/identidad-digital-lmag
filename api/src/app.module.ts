import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InterestsModule } from './interests/interests.module';

@Controller()
class HealthController {
  @Get('health')
  health() { return { status: 'ok' }; }
}

@Module({ imports: [PrismaModule, AuthModule, InterestsModule], controllers: [HealthController] })
export class AppModule {}
