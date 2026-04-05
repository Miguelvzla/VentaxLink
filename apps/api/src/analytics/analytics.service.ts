import { Injectable } from '@nestjs/common';
import { PlanType, Prisma } from '@prisma/client';
import {
  analyticsRangeDaysForPlan,
  proAnalyticsDashboardForPlan,
  productDetailViewsAnalyticsForPlan,
} from '../common/plan-limits';
import { PrismaService } from '../prisma/prisma.service';
import { rewriteStoredUploadsUrl } from '../uploads/public-asset-url';

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

function formatDateArgentina(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function enumerateInclusiveYmd(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  let cur = start;
  for (;;) {
    out.push(cur);
    if (cur === end) break;
    const d = new Date(cur + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    cur = `${y}-${m}-${day}`;
  }
  return out;
}

async function primaryImageUrlByProductId(
  prisma: PrismaService,
  productIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (productIds.length === 0) return map;
  const imgs = await prisma.productImage.findMany({
    where: { product_id: { in: productIds } },
    orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
    select: { product_id: true, url: true },
  });
  for (const im of imgs) {
    if (map.has(im.product_id)) continue;
    map.set(
      im.product_id,
      im.url ? rewriteStoredUploadsUrl(im.url) ?? im.url : null,
    );
  }
  for (const id of productIds) {
    if (!map.has(id)) map.set(id, null);
  }
  return map;
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
    const dashboardPro = proAnalyticsDashboardForPlan(plan);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [
      productCount,
      activeProductCount,
      orderCount,
      customerCount,
      ordersInRange,
      visitCountInRange,
      events,
      topRaw,
      valuationRow,
    ] = await Promise.all([
      this.prisma.product.count({ where: { tenant_id: tenantId } }),
      this.prisma.product.count({
        where: { tenant_id: tenantId, is_active: true },
      }),
      this.prisma.order.count({ where: { tenant_id: tenantId } }),
      this.prisma.customer.count({ where: { tenant_id: tenantId } }),
      this.prisma.order.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: since },
        },
      }),
      this.prisma.analyticsEvent.count({
        where: {
          tenant_id: tenantId,
          event: 'tienda_vista',
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
      dashboardPro
        ? this.prisma.$queryRaw<[{ sum: string | null }]>`
            SELECT COALESCE(
              SUM(p.stock::numeric * p.price::numeric),
              0
            )::text AS sum
            FROM "Product" p
            WHERE p.tenant_id = ${tenantId}
          `
        : Promise.resolve([{ sum: null }] as [{ sum: string | null }]),
    ]);

    const eventsMapped = events.map((e) => ({
      event: e.event,
      count: e._count._all,
    }));
    const eventsInRange = topViewsEnabled
      ? eventsMapped
      : eventsMapped.filter((e) => e.event !== 'producto_vista');

    const storeValuationArs =
      dashboardPro && valuationRow[0]?.sum != null ? valuationRow[0].sum : null;

    let dailyVisitsVsOrders: Array<{
      date: string;
      visits: number;
      orders: number;
    }> = [];
    let topSoldProducts: Array<{
      product_id: string;
      name: string;
      slug: string;
      image_url: string | null;
      quantity_sold: number;
    }> = [];

    if (dashboardPro) {
      const [visitDays, orderDays, soldRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ day: string; c: bigint }>>`
          SELECT to_char(
            (ae.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
            'YYYY-MM-DD'
          ) AS day,
          COUNT(*)::bigint AS c
          FROM "AnalyticsEvent" ae
          WHERE ae.tenant_id = ${tenantId}
            AND ae.event = 'tienda_vista'
            AND ae.created_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `,
        this.prisma.$queryRaw<Array<{ day: string; c: bigint }>>`
          SELECT to_char(
            (o.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
            'YYYY-MM-DD'
          ) AS day,
          COUNT(*)::bigint AS c
          FROM "Order" o
          WHERE o.tenant_id = ${tenantId}
            AND o.status <> 'CANCELLED'::"OrderStatus"
            AND o.created_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `,
        this.prisma.$queryRaw<
          Array<{ product_id: string; qty: bigint }>
        >`
          SELECT oi.product_id, SUM(oi.quantity)::bigint AS qty
          FROM "OrderItem" oi
          INNER JOIN "Order" o ON o.id = oi.order_id
          WHERE o.tenant_id = ${tenantId}
            AND o.status <> 'CANCELLED'::"OrderStatus"
            AND o.created_at >= ${since}
          GROUP BY oi.product_id
          ORDER BY qty DESC
          LIMIT 12
        `,
      ]);

      const visitMap = new Map(
        visitDays.map((r) => [r.day, Number(r.c)]),
      );
      const orderMap = new Map(
        orderDays.map((r) => [r.day, Number(r.c)]),
      );
      const startKey = formatDateArgentina(since);
      const endKey = formatDateArgentina(new Date());
      const dayKeys = enumerateInclusiveYmd(startKey, endKey);
      dailyVisitsVsOrders = dayKeys.map((date) => ({
        date,
        visits: visitMap.get(date) ?? 0,
        orders: orderMap.get(date) ?? 0,
      }));

      const soldIds = soldRows.map((r) => r.product_id);
      if (soldIds.length > 0) {
        const prods = await this.prisma.product.findMany({
          where: { id: { in: soldIds }, tenant_id: tenantId },
          select: { id: true, name: true, slug: true },
        });
        const byId = new Map(prods.map((p) => [p.id, p]));
        const soldImgMap = await primaryImageUrlByProductId(this.prisma, soldIds);
        for (const row of soldRows) {
          const p = byId.get(row.product_id);
          if (!p) continue;
          topSoldProducts.push({
            product_id: p.id,
            name: p.name,
            slug: p.slug,
            image_url: soldImgMap.get(p.id) ?? null,
            quantity_sold: Number(row.qty),
          });
        }
      }
    }

    const topSlugs = topRaw
      .filter((r) => r.slug)
      .map((r) => r.slug as string);
    const topProductsMeta =
      topViewsEnabled && topSlugs.length > 0
        ? await this.prisma.product.findMany({
            where: { tenant_id: tenantId, slug: { in: topSlugs } },
            select: { id: true, slug: true, name: true },
          })
        : [];
    const metaBySlug = new Map(topProductsMeta.map((p) => [p.slug, p]));

    const topProductViewsBase = topRaw
      .filter((r) => r.slug)
      .map((r) => {
        const slug = r.slug as string;
        const meta = metaBySlug.get(slug);
        return {
          product_slug: slug,
          views: Number(r.views),
          name: meta?.name ?? null,
          product_id: meta?.id ?? null,
        };
      });

    const viewIds = topProductViewsBase
      .map((r) => r.product_id)
      .filter((id): id is string => !!id);
    const viewImgMap = dashboardPro
      ? await primaryImageUrlByProductId(this.prisma, viewIds)
      : new Map<string, string | null>();
    const topProductViews = topProductViewsBase.map((row) => ({
      ...row,
      image_url:
        dashboardPro && row.product_id
          ? (viewImgMap.get(row.product_id) ?? null)
          : null,
    }));

    return {
      data: {
        productCount,
        activeProductCount,
        orderCount,
        customerCount,
        ordersInRange,
        rangeDays: days,
        topProductViewsEnabled: topViewsEnabled,
        dashboardPro,
        storeValuationArs,
        visitCountInRange,
        eventsInRange,
        topProductViews,
        dailyVisitsVsOrders,
        topSoldProducts,
      },
    };
  }
}
