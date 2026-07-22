import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentCommerce = createParamDecorator(
  (_data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().commerce,
);
