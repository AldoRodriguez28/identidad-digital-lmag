import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RecursosService } from './recursos.service';
import { CreateRecursoDto, UpdateRecursoDto, RECURSO_TIPOS, RecursoTipo } from './dto/recurso.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/recursos')
export class RecursosAdminController {
  constructor(private recursos: RecursosService) {}

  @Get()
  list(@Query('tipo') tipo?: string) {
    const t = RECURSO_TIPOS.includes(tipo as RecursoTipo) ? (tipo as RecursoTipo) : undefined;
    return this.recursos.listAdmin(t);
  }

  @Post()
  create(@Body() dto: CreateRecursoDto) { return this.recursos.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecursoDto) { return this.recursos.update(id, dto); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.recursos.remove(id); }
}
