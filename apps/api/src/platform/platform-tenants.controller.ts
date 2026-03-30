import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformPatchTenantDto } from './dto/platform-patch-tenant.dto';
import { PlatformJwtAuthGuard } from './platform-jwt-auth.guard';
import { PlatformTenantsService } from './platform-tenants.service';

@Controller('platform/tenants')
@UseGuards(PlatformJwtAuthGuard)
export class PlatformTenantsController {
  constructor(private readonly tenants: PlatformTenantsService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.tenants.list(q);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PlatformPatchTenantDto) {
    return this.tenants.patch(id, dto);
  }
}
