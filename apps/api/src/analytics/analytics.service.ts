import { Injectable } from '@nestjs/common';
import { PlanType, Prisma } from '@prisma/client';
import {
  analyticsRangeDaysForPlan,
  productDetailViewsAnalyticsForPlan,
} from '../common/plan-limits';
import { PrismaService } from '../prisma/prisma.service';

/** Inicio del día calendario en Argentina (UTC−3, sin horario de verano). */
function startOfTodayArgentina(): Date {
  const tz = 'America/Argentina/Buenos_Aires';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  const y = Number(parts.year);
  const m = Number(parts.month);
  const day = Number(parts.day);
  return new Date(Date.UTC(y, m - 1, day, 3, 0, 0));
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Métricas del día calendario (Argentina) para el dashboard del comercio. */
  async dashboardToday(tenantId: string) {
    const start = startOfTodayArgentina();

    const [orderAgg, customersNewToday] = await Promise.all([
      this.prisma.order.aggregate({
        where: { tenant_id: tenantId, created_at: { gte: start } },
        _sum: { total: true },
        _avg: { total: true },
        _count: true,
      }),
      this.prisma.customer.count({
        where: { tenant_id: tenantId, created_at: { gte: start } },
      }),
    ]);

    const ordersToday = orderAgg._count;
    const sum = orderAgg._sum.total ?? new Prisma.Decimal(0);
    const salesToday = sum.toString();
    const avg = orderAgg._avg.total;
    const avgTicketToday =
      ordersToday > 0 && avg != null ? avg.toString() : null;

    return {
      data: {
        ordersToday,
        salesToday,
        avgTicketToday,
        customersNewToday,
      },
    };
  }

  async summary(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    const plan = tenant?.plan ?? PlanType.STARTER;
    const days = analyticsRangeDaysForPlan(plan);
    const topViewsEnabled = productDetailViewsAnalyticsForPlan(plan);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [productCount, orderCount, customerCount, ordersInRange, events, topRaw] =
      await Promise.all([
        this.prisma.product.count({ where: { tenant_id: tenantId } }),
        this.prisma.order.count({ where: { tenant_id: tenantId } }),
        this.prisma.customer.count({ where: { tenant_id: tenantId } }),
        this.prisma.order.count({
          where: {
            tenant_id: tenantId,
            created_at: { gte: since },
          },
        }),
        this.prisma.analyticsEvent.groupBy({
          by: ['event'],
          where: { tenant_id: tenantId, created_at: { gte: since } },
          _count: { _all: true },
        }),
        topViewsEnabled
          ? this.prisma.$queryRaw<Array<{ slug: string | null; views: bigint }>>`
              SELECT properties->>'product_slug' AS slug, COUNT(*)::bigint AS views
              FROM "AnalyticsEvent"
              WHERE tenant_id = ${tenantId}
                AND event = 'producto_vista'
                AND created_at >= ${since}
                AND COALESCE(properties->>'product_slug', '') <> ''
              GROUP BY 1
              ORDER BY views DESC
              LIMIT 15
            `
          : Promise.resolve([] as Array<{ slug: string | null; views: bigint }>),
      ]);

    const eventsMapped = events.map((e) => ({
      event: e.event,
      count: e._count._all,
    }));
    const eventsInRange = topViewsEnabled
      ? eventsMapped
      : eventsMapped.filter((e) => e.event !== 'producto_vista');

    return {
      data: {
        productCount,
        orderCount,
        customerCount,
        ordersInRange,
        rangeDays: days,
        topProductViewsEnabled: topViewsEnabled,
        eventsInRange,
        topProductViews: topRaw
          .filter((r) => r.slug)
          .map((r) => ({
            product_slug: r.slug as string,
            views: Number(r.views),
          })),
      },
    };
  }
}

