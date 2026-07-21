import { Controller, Get } from '@nestjs/common';
import { InterestsService } from './interests.service';

@Controller('interests')
export class InterestsController {
  constructor(private interests: InterestsService) {}
  @Get()
  findAll() { return this.interests.findAll(); }
}
