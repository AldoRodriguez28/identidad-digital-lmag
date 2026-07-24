import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}

  @Get()
  list() { return this.jobs.listPublic(); }
}
