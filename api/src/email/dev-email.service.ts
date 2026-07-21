import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';

@Injectable()
export class DevEmailService extends EmailService {
  send(to: string, subject: string, body: string): Promise<void> {
    console.log(`[email] to=${to} subject=${subject}\n${body}`);
    return Promise.resolve();
  }
}
