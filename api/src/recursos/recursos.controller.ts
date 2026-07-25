import { Controller, Get, Query } from '@nestjs/common';
import { RecursosService } from './recursos.service';
import { RECURSO_TIPOS, RecursoTipo } from './dto/recurso.dto';

@Controller('recursos')
export class RecursosController {
  constructor(private recursos: RecursosService) {}

  @Get()
  list(@Query('tipo') tipo?: string) {
    const t = RECURSO_TIPOS.includes(tipo as RecursoTipo) ? (tipo as RecursoTipo) : undefined;
    return this.recursos.listPublic(t);
  }
}
