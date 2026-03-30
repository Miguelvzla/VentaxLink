import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformJwtAuthGuard } from './platform-jwt-auth.guard';
import { PlatformTenantsController } from './platform-tenants.controller';
import { PlatformTenantsService } from './platform-tenants.service';

@Module({
  imports: [AuthModule],
  controllers: [PlatformAuthController, PlatformTenantsController],
  providers: [
    PlatformAuthService,
    PlatformTenantsService,
    PlatformJwtAuthGuard,
  ],
  exports: [PlatformJwtAuthGuard],
})
export class PlatformModule {}
