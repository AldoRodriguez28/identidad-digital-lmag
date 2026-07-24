import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, CheckinDto } from './dto/event.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/events')
export class EventsAdminController {
  constructor(private events: EventsService) {}

  @Get()
  list() { return this.events.listAdmin(); }

  @Post()
  create(@Body() dto: CreateEventDto) { return this.events.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) { return this.events.update(id, dto); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.events.remove(id); }

  @Post(':id/checkin')
  checkin(@Param('id') id: string, @Body() dto: CheckinDto, @CurrentUser() user: any) {
    return this.events.checkin(id, dto.credentialToken, user.id);
  }
}
