import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CommercesAdminService } from './commerces-admin.service';
import { CreateCommerceDto, UpdateCommerceDto } from './dto/commerce-admin.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/commerces')
export class CommercesAdminController {
  constructor(private commerces: CommercesAdminService) {}

  @Get()
  list() { return this.commerces.list(); }

  @Post()
  create(@Body() dto: CreateCommerceDto) {
    return this.commerces.create(dto.nombre, dto.descripcion, dto.porcentajeDescuento, dto.email, dto.password);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommerceDto) {
    return this.commerces.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.commerces.remove(id); }
}
