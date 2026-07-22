import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { EmailModule } from './email/email.module';
import { InterestsModule } from './interests/interests.module';
import { StudentsModule } from './students/students.module';
import { CommerceModule } from './commerce/commerce.module';
import { AdminModule } from './admin/admin.module';

@Controller()
class HealthController {
  @Get('health')
  health() { return { status: 'ok' }; }
}

@Module({ imports: [PrismaModule, AuthModule, StorageModule, EmailModule, InterestsModule, StudentsModule, CommerceModule, AdminModule], controllers: [HealthController] })
export class AppModule {}
