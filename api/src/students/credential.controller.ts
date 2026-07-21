import { Controller, Get, Param } from '@nestjs/common';
import { StudentsService } from './students.service';

// Ruta PÚBLICA por diseño: acceso por credentialToken opaco no adivinable (no CURP). NO añadir guard de sesión.
@Controller('c')
export class CredentialController {
  constructor(private students: StudentsService) {}
  @Get(':token')
  get(@Param('token') token: string) {
    return this.students.getCredentialByToken(token);
  }
}
