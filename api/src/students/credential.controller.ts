import { Controller, Get, Param } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('c')
export class CredentialController {
  constructor(private students: StudentsService) {}
  @Get(':token')
  get(@Param('token') token: string) {
    return this.students.getCredentialByToken(token);
  }
}
