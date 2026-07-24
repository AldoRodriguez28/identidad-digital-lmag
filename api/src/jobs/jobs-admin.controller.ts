import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/jobs')
export class JobsAdminController {
  constructor(private jobs: JobsService) {}

  @Get()
  list() { return this.jobs.listAdmin(); }

  @Post()
  create(@Body() dto: CreateJobDto) { return this.jobs.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) { return this.jobs.update(id, dto); }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) { await this.jobs.remove(id); }
}
