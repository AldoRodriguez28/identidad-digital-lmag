import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { DevEmailService } from './dev-email.service';

@Global()
@Module({
  providers: [{ provide: EmailService, useClass: DevEmailService }],
  exports: [EmailService],
})
export class EmailModule {}
