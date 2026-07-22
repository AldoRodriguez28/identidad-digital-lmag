import { Controller, Delete, Get, HttpCode, NotFoundException, Param, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { ListQueryDto } from './dto/list-query.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/students')
export class StudentsAdminController {
  constructor(private admin: AdminService) {}

  @Get()
  list(@Query() q: ListQueryDto) {
    return this.admin.listStudents(q.page ?? 1, q.pageSize ?? 20);
  }

  @Get(':id/ine/:side')
  async ine(
    @Param('id') id: string,
    @Param('side') side: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { path, contentType } = await this.admin.getInePath(id, side);
    if (!existsSync(path)) throw new NotFoundException();
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': 'attachment',
      'Cache-Control': 'no-store',
    });
    return new StreamableFile(createReadStream(path));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.admin.getStudent(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.admin.deleteStudent(id);
  }
}
