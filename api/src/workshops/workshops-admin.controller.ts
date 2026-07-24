import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/workshop.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/workshops')
export class WorkshopsAdminController {
  constructor(private workshops: WorkshopsService) {}

  @Get()
  list() { return this.workshops.listAdmin(); }

  @Post()
  create(@Body() dto: CreateWorkshopDto) { return this.workshops.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkshopDto) { return this.workshops.update(id, dto); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.workshops.remove(id); }
}
