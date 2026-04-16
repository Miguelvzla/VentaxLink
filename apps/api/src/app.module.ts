import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { CouponsModule } from './coupons/coupons.module';
import { CustomersModule } from './customers/customers.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PlatformModule } from './platform/platform.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';
import { ProductsModule } from './products/products.module';
import { StoreModule } from './store/store.module';
import { TenantModule } from './tenant/tenant.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    HealthModule,
    StoreModule,
    ProductsModule,
    PlatformModule,
    PublicModule,
    UploadsModule,
    OrdersModule,
    CustomersModule,
    TenantModule,
    AnalyticsModule,
    CouponsModule,
    CategoriesModule,
  ],
})
export class AppModule {}
