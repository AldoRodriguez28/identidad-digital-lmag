import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import { CommerceService } from './commerce.service';

@Controller('benefits')
export class BenefitsController {
  constructor(private commerce: CommerceService) {}

  @Get()
  list() { return this.commerce.listBenefits(); }

  @Get(':id/logo')
  async logo(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { path, contentType } = await this.commerce.getLogoPath(id);
    if (!existsSync(path)) throw new NotFoundException();
    res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
    return new StreamableFile(createReadStream(path));
  }
}
