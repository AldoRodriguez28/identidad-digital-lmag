import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Controller()
class HealthController {
  @Get('health')
  health() { return { status: 'ok' }; }
}

@Module({ imports: [PrismaModule], controllers: [HealthController] })
export class AppModule {}
