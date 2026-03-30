import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary(@CurrentUser() user: { tid: string }) {
    return this.analytics.summary(user.tid);
  }

  @Get('dashboard-today')
  dashboardToday(@CurrentUser() user: { tid: string }) {
    return this.analytics.dashboardToday(user.tid);
  }
}
