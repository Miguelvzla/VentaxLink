import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @Get('me')
  me(@CurrentUser() user: { tid: string }) {
    return this.tenant.getMe(user.tid);
  }

  @Patch('me')
  patch(@CurrentUser() user: { tid: string }, @Body() dto: UpdateTenantDto) {
    return this.tenant.updateMe(user.tid, dto);
  }
}
