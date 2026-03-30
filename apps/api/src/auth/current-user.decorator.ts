import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUserPayload } from './jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    return (ctx.switchToHttp().getRequest() as { user: JwtUserPayload }).user;
  },
);
