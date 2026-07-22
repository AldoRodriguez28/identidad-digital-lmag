import { Controller, Get } from '@nestjs/common';
import { CommerceService } from './commerce.service';

@Controller('benefits')
export class BenefitsController {
  constructor(private commerce: CommerceService) {}
  @Get()
  list() { return this.commerce.listBenefits(); }
}
