import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto } from '../auth/dto/login.dto';
import { PlatformAuthService } from './platform-auth.service';

@Controller('platform-auth')
export class PlatformAuthController {
  constructor(private readonly platformAuth: PlatformAuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.platformAuth.login(dto);
  }
}
