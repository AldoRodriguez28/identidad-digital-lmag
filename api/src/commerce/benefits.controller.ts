import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { CommerceService } from './commerce.service';

@Controller('benefits')
export class BenefitsController {
  constructor(private commerce: CommerceService) {}

  @Get()
  list() { return this.commerce.listBenefits(); }

  @Get(':id/logo')
  async logo(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { buffer, contentType } = await this.commerce.getLogoFile(id);
    res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
    return new StreamableFile(buffer);
  }
}
