import { Controller, Get } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';

@Controller('workshops')
export class WorkshopsController {
  constructor(private workshops: WorkshopsService) {}

  @Get()
  list() { return this.workshops.listPublic(); }
}
