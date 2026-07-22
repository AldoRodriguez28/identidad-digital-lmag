import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private admin: AdminService) {}
  @Get()
  dashboard() { return this.admin.dashboard(); }
}
