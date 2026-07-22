import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { InternalUsersService } from './internal-users.service';
import { CreateInternalUserDto, UpdateInternalUserDto } from './dto/internal-user.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
@Controller('admin/internal-users')
export class InternalUsersController {
  constructor(private users: InternalUsersService) {}

  @Get()
  list() { return this.users.list(); }

  @Post()
  create(@Body() dto: CreateInternalUserDto) {
    return this.users.create(dto.email, dto.nombre, dto.rol, dto.password);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInternalUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.users.remove(id, user.id);
  }
}
