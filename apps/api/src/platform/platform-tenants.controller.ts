import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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

  @Get('settings/marketplace-terms')
  getMarketplaceTerms() {
    return this.tenants.getMarketplaceTerms();
  }

  @Patch('settings/marketplace-terms')
  @HttpCode(200)
  patchMarketplaceTerms(@Body() dto: { terms?: string }) {
    return this.tenants.patchMarketplaceTerms(dto.terms ?? '');
  }

  /** Super admin: contraseña provisoria para el OWNER del comercio (aparte del flujo “olvidé contraseña”). */
  @Post(':id/reset-owner-password')
  @HttpCode(200)
  resetOwnerPassword(@Param('id') id: string) {
    return this.tenants.resetOwnerPassword(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PlatformPatchTenantDto) {
    return this.tenants.patch(id, dto);
  }
}
