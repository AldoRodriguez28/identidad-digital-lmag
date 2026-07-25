import { Body, Controller, Delete, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { InterestDto } from './dto/interest.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/interests')
export class InterestsAdminController {
  constructor(private admin: AdminService) {}

  @Post()
  create(@Body() dto: InterestDto) { return this.admin.createInterest(dto.nombre, dto.categoria); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: InterestDto) { return this.admin.updateInterest(id, dto.nombre, dto.categoria); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.admin.deleteInterest(id); }
}
