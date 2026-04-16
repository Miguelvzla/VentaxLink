import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CouponType, PlanType, Prisma, TenantStatus } from '@prisma/client';
import { OrderNotificationsService } from '../notifications/order-notifications.service';
import type { TenantSmtpForMail } from '../notifications/order-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { productDetailViewsAnalyticsForPlan } from '../common/plan-limits';
import { rewriteStoredUploadsUrl } from '../uploads/public-asset-url';
import { CheckoutDto } from './dto/checkout.dto';
import { TrackEventDto } from './dto/track-event.dto';
import {
  buildOgCollagePng,
  fetchImageBuffer,
  firstUsableProductImageUrl,
  hashOgPreviewVersion,
  resolveAbsoluteUrlForFetch,
} from './store-og-collage';
import { encodeOgFallbackPng } from './store-og-fallback-png';

const CATALOG_CAP_SUSPENDED = 20;

const DEFAULT_BILLING_HOLD_MSG =
  'Esta tienda muestra solo 20 productos hasta que el comercio confirme el pago. El resto del catálogo volverá a estar visible una vez acreditado el mismo.';

const tenantPublicSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  logo_url: true,
  banner_url: true,
  primary_color: true,
  secondary_color: true,
  phone: true,
  whatsapp_number: true,
  instagram_url: true,
  facebook_url: true,
  tiktok_url: true,
  google_maps_url: true,
  address: true,
  schedule: true,
  status: true,
  billing_hold_message: true,
  plan: true,
  points_enabled: true,
  points_ars_per_point: true,
  points_redeem_min_balance: true,
  points_redeem_percent: true,
  points_redeem_cost: true,
  billing_payment_alias: true,
} as const;

function storeBaseUrl(): string {
  return (process.env.PUBLIC_STORE_URL || 'http://localhost:3003').replace(
    /\/$/,
    '',
  );
}

function tenantSmtpFromRow(t: {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
}): TenantSmtpForMail | null {
  const host = t.smtp_host?.trim();
  const from = t.smtp_from_email?.trim();
  if (!host || !from) return null;
  return {
    host,
    port: t.smtp_port ?? 587,
    secure: t.smtp_secure ?? false,
    user: t.smtp_user?.trim() || null,
    pass: t.smtp_pass ?? null,
    fromEmail: from,
    fromName: t.smtp_from_name?.trim() || null,
  };
}

function escapeHtmlStore(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function redactEmailHint(email: string): string {
  const [u, d] = email.split('@');
  if (!d) return '***';
  const left = u.length <= 2 ? '*' : `${u.slice(0, 2)}…`;
  return `${left}@${d}`;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderNotifications: OrderNotificationsService,
  ) {}

  /**
   * Primeros 4 productos del catálogo (mismo orden que listProducts) con al menos una imagen usable.
   * Versión OG derivada en memoria (sin columnas nuevas en BD).
   */
  private async loadOgSharePreviewForTenant(
    tenantId: string,
    status: TenantStatus,
  ): Promise<{
    og_preview_version: string;
    fetchUrls: (string | null)[];
  }> {
    const suspended = status === TenantStatus.SUSPENDED;
    const idIn = suspended
      ? [...(await this.visibleProductIdsForSuspended(tenantId))]
      : null;

    const where: Prisma.ProductWhereInput = {
      tenant_id: tenantId,
      is_active: true,
      ...(idIn ? { id: { in: idIn } } : {}),
    };

    const rows = await this.prisma.product.findMany({
      where,
      orderBy: [
        { is_featured: 'desc' },
        { sort_order: 'asc' },
        { created_at: 'desc' },
      ],
      take: 200,
      select: {
        id: true,
        updated_at: true,
        images: {
          orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
          take: 3,
          select: { url: true },
        },
      },
    });

    const picked: { id: string; updated_at: Date; url: string }[] = [];
    for (const r of rows) {
      const url = firstUsableProductImageUrl(r.images);
      if (!url) continue;
      picked.push({ id: r.id, updated_at: r.updated_at, url });
      if (picked.length === 4) break;
    }

    const versionInput =
      picked.length > 0
        ? picked.map((p) => `${p.id}:${p.updated_at.toISOString()}`).join('|')
        : `e:${tenantId}:${rows
            .slice(0, 48)
            .map((r) => `${r.id}:${r.updated_at.toISOString()}`)
            .join(';')}`;
    const og_preview_version = hashOgPreviewVersion(versionInput);

    const fetchUrls: (string | null)[] = [null, null, null, null];
    for (let i = 0; i < picked.length; i++) {
      fetchUrls[i] = resolveAbsoluteUrlForFetch(picked[i].url);
    }
    return { og_preview_version, fetchUrls };
  }

  private async visibleProductIdsForSuspended(tenantId: string) {
    const rows = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: [
        { is_featured: 'desc' },
        { sort_order: 'asc' },
        { created_at: 'desc' },
      ],
      select: { id: true },
      take: CATALOG_CAP_SUSPENDED,
    });
    return new Set(rows.map((r) => r.id));
  }

  async getPublicTenant(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { not: 'CANCELLED' } },
      select: tenantPublicSelect,
    });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    const suspended = tenant.status === TenantStatus.SUSPENDED;
    let totalProducts = 0;
    if (suspended) {
      totalProducts = await this.prisma.product.count({
        where: { tenant_id: tenant.id, is_active: true },
      });
    }
    const billing_hold_message = suspended
      ? (tenant.billing_hold_message?.trim() || DEFAULT_BILLING_HOLD_MSG)
      : null;
    const pe = tenant.points_enabled === true;
    const og = await this.loadOgSharePreviewForTenant(tenant.id, tenant.status);
    return {
      data: {
        ...tenant,
        logo_url: rewriteStoredUploadsUrl(tenant.logo_url),
        banner_url: rewriteStoredUploadsUrl(tenant.banner_url),
        og_preview_version: og.og_preview_version,
        catalog_limited: suspended,
        catalog_visible_cap: suspended ? CATALOG_CAP_SUSPENDED : null,
        catalog_total_products: suspended ? totalProducts : null,
        billing_hold_message,
        billing_payment_alias: tenant.billing_payment_alias ?? null,
        points_ars_per_point:
          pe && tenant.points_ars_per_point
            ? tenant.points_ars_per_point.toString()
            : null,
        points_redeem_min_balance: pe ? tenant.points_redeem_min_balance : null,
        points_redeem_percent:
          pe && tenant.points_redeem_percent
            ? tenant.points_redeem_percent.toString()
            : null,
        points_redeem_cost: pe ? tenant.points_redeem_cost : null,
      },
    };
  }

  async getOgCollageForHttp(
    slug: string,
  ): Promise<{ body: Buffer; version: string }> {
    let version = '0';
    try {
      const tenant = await this.prisma.tenant.findFirst({
        where: { slug, status: { not: 'CANCELLED' } },
        select: { id: true, status: true },
      });
      if (!tenant) {
        throw new NotFoundException('Tienda no encontrada');
      }
      const og = await this.loadOgSharePreviewForTenant(tenant.id, tenant.status);
      version = og.og_preview_version;
      const buffers = await Promise.all(
        og.fetchUrls.map((u) => (u ? fetchImageBuffer(u) : Promise.resolve(null))),
      );
      const body = await buildOgCollagePng([
        buffers[0] ?? null,
        buffers[1] ?? null,
        buffers[2] ?? null,
        buffers[3] ?? null,
      ]);
      return { body, version };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `[og-collage] slug=${slug} — se sirve fallback gris: ${msg}`,
        stack,
      );
      return { body: encodeOgFallbackPng(), version };
    }
  }

  /**
   * Envío de prueba usando solo SMTP global (MAIL_FROM / SMTP_* de Railway).
   * Destino: MAIL_TEST_TO o email del comercio en BD.
   */
  async sendProMailTest(slug: string) {
    const enabled =
      process.env.ENABLE_STORE_SMTP_TEST === '1' ||
      process.env.ENABLE_STORE_SMTP_TEST === 'true';
    if (!enabled) {
      this.logger.warn(
        `[mail-test] rechazado: ENABLE_STORE_SMTP_TEST no está en true (slug=${slug})`,
      );
      throw new ForbiddenException(
        'La prueba de correo no está habilitada en el servidor. En Railway agregá ENABLE_STORE_SMTP_TEST=true en el servicio de la API.',
      );
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { not: 'CANCELLED' } },
      select: { plan: true, email: true, name: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    if (
      tenant.plan !== PlanType.PRO &&
      tenant.plan !== PlanType.WHOLESALE
    ) {
      this.logger.warn(
        `[mail-test] rechazado: plan ${tenant.plan} (slug=${slug})`,
      );
      throw new ForbiddenException(
        'Solo tiendas con plan Pro o Mayorista pueden usar la prueba de correo.',
      );
    }

    const toRaw =
      process.env.MAIL_TEST_TO?.trim() || tenant.email?.trim() || '';
    if (!toRaw) {
      this.logger.warn(
        `[mail-test] sin destino: MAIL_TEST_TO vacío y tenant sin email (slug=${slug})`,
      );
      throw new BadRequestException(
        'No hay destinatario: configurá MAIL_TEST_TO en Railway o el email del comercio en el panel de administración.',
      );
    }

    const smtpHost = !!process.env.SMTP_HOST?.trim();
    const mailFrom = !!process.env.MAIL_FROM?.trim();
    const smtpUser = !!process.env.SMTP_USER?.trim();
    const smtpPass = !!process.env.SMTP_PASS?.trim();
    this.logger.log(
      `[mail-test] inicio slug=${slug} plan=${tenant.plan} to=${redactEmailHint(toRaw)} smtp_host=${smtpHost} mail_from=${mailFrom} smtp_user=${smtpUser} smtp_pass=${smtpPass} port=${process.env.SMTP_PORT ?? '587'} secure=${process.env.SMTP_SECURE ?? 'false'}`,
    );

    const subject = `[VentaXLink] Prueba de correo — ${tenant.name}`;
    const text = [
      'Si recibís este mensaje, el envío SMTP de la plataforma (Railway) está funcionando.',
      '',
      `Tienda: ${tenant.name}`,
      `Slug: ${slug}`,
      `Hora (servidor): ${new Date().toISOString()}`,
      '',
      '— VentaXLink (prueba automática)',
    ].join('\n');
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p><strong>Prueba SMTP VentaXLink</strong></p>
<p>Si ves esto, el SMTP configurado en Railway entregó el mensaje.</p>
<p>Tienda: <strong>${escapeHtmlStore(tenant.name)}</strong><br/>Slug: <code>${escapeHtmlStore(slug)}</code><br/>Hora UTC: ${escapeHtmlStore(new Date().toISOString())}</p>
<p style="color:#666;font-size:14px">— VentaXLink</p>
</body></html>`;

    try {
      const ok = await this.orderNotifications.sendPlatformEmail({
        to: toRaw,
        subject,
        text,
        html,
      });
      if (!ok) {
        this.logger.error(
          `[mail-test] sendPlatformEmail=false (falta SMTP_HOST o MAIL_FROM) slug=${slug}`,
        );
        throw new BadGatewayException(
          'SMTP global incompleto: revisá en Railway SMTP_HOST, MAIL_FROM y (si aplica) SMTP_USER / SMTP_PASS.',
        );
      }
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `[mail-test] error nodemailer slug=${slug}: ${msg}`,
        stack,
      );
      const cloudSmtpHint =
        /connection timeout|ETIMEDOUT|ECONNREFUSED/i.test(msg)
          ? ' Desde varios datacenters (p. ej. Railway) Gmail a menudo no abre TCP a smtp.gmail.com:587: probá SMTP_IP_FAMILY=4 en la API; si sigue igual, usá SMTP de Brevo, SendGrid o Mailgun (host que ellos indiquen).'
          : '';
      throw new BadGatewayException(
        `No se pudo enviar el correo (SMTP): ${msg}.${cloudSmtpHint} Revisá logs (mail-test) y contraseña de aplicación si usás Gmail.`,
      );
    }

    this.logger.log(
      `[mail-test] enviado ok slug=${slug} to=${redactEmailHint(toRaw)}`,
    );
    return {
      ok: true,
      message:
        'Correo de prueba enviado. Revisá la bandeja de entrada y spam.',
      to_hint: redactEmailHint(toRaw),
    };
  }

  async listCategories(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { not: 'CANCELLED' } },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tienda no encontrada');
    const cats = await this.prisma.category.findMany({
      where: { tenant_id: tenant.id, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    });
    return { data: cats };
  }

  async listProducts(
    slug: string,
    page: number,
    limit: number,
    searchRaw?: string,
    filters?: { featuredOnly?: boolean; newOnly?: boolean; categorySlug?: string },
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { not: 'CANCELLED' } },
      select: { id: true, status: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const searchTerm = searchRaw?.trim().slice(0, 120) || undefined;
    const searchOr: Prisma.ProductWhereInput | undefined = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { short_desc: { contains: searchTerm, mode: 'insensitive' } },
            { slug: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const suspended = tenant.status === TenantStatus.SUSPENDED;
    const whereBase: Prisma.ProductWhereInput = {
      tenant_id: tenant.id,
      is_active: true,
      ...(searchOr ?? {}),
    };

    // Filtro por categoría (slug)
    let categoryFilter: Prisma.ProductWhereInput = {};
    if (filters?.categorySlug) {
      const cat = await this.prisma.category.findFirst({
        where: { tenant_id: tenant.id, slug: filters.categorySlug, is_active: true },
        select: { id: true },
      });
      categoryFilter = cat ? { category_id: cat.id } : { id: 'none' };
    }

    const flagWhere: Prisma.ProductWhereInput = {
      ...(filters?.featuredOnly ? { is_featured: true } : {}),
      ...(filters?.newOnly ? { is_new: true } : {}),
      ...categoryFilter,
    };
    const hasFlags =
      filters?.featuredOnly === true || filters?.newOnly === true || !!filters?.categorySlug;

    let where: Prisma.ProductWhereInput = hasFlags
      ? { AND: [whereBase, flagWhere] }
      : whereBase;
    if (suspended) {
      const ids = await this.visibleProductIdsForSuspended(tenant.id);
      where = { AND: [where, { id: { in: [...ids] } }] };
    }

    const [fullTotal, listedTotal, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereBase }),
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [
          { is_featured: 'desc' },
          { sort_order: 'asc' },
          { created_at: 'desc' },
        ],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          slug: true,
          name: true,
          short_desc: true,
          price: true,
          compare_price: true,
          is_featured: true,
          is_new: true,
          stock: true,
          track_stock: true,
          unit: true,
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
            take: 3,
            select: { url: true, alt: true, is_primary: true },
          },
        },
      }),
    ]);

    const displayTotal = searchTerm
      ? listedTotal
      : suspended
        ? Math.min(CATALOG_CAP_SUSPENDED, fullTotal)
        : fullTotal;

    return {
      data: rows.map((p) => ({
        ...p,
        price: p.price.toString(),
        compare_price: p.compare_price?.toString() ?? null,
        unit: p.unit ?? 'unidad',
        images: p.images.map((im) => ({
          ...im,
          url: rewriteStoredUploadsUrl(im.url) ?? im.url,
        })),
      })),
      meta: {
        total: displayTotal,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(displayTotal / safeLimit) || 1,
      },
    };
  }

  async getProduct(slug: string, productSlug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { not: 'CANCELLED' } },
      select: { id: true, status: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        tenant_id: tenant.id,
        slug: productSlug,
        is_active: true,
      },
      include: {
        images: {
          orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
        },
        variants: {
          where: { is_active: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (tenant.status === TenantStatus.SUSPENDED) {
      const allowed = await this.visibleProductIdsForSuspended(tenant.id);
      if (!allowed.has(product.id)) {
        throw new NotFoundException('Producto no disponible');
      }
    }

    return {
      data: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        short_desc: product.short_desc,
        price: product.price.toString(),
        compare_price: product.compare_price?.toString() ?? null,
        is_featured: product.is_featured,
        is_new: product.is_new,
        stock: product.stock,
        track_stock: product.track_stock,
        weight: product.weight,
        tags: product.tags,
        images: product.images.map((im) => ({
          ...im,
          url: rewriteStoredUploadsUrl(im.url) ?? im.url,
        })),
        variants: product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          value: v.value,
          price_modifier: v.price_modifier.toString(),
          stock: v.stock,
          sku: v.sku,
        })),
      },
    };
  }

  private async resolveStoreCouponTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    plan: PlanType,
    code: string | undefined,
    subtotal: Prisma.Decimal,
  ): Promise<{
    discount: Prisma.Decimal;
    couponId: string | null;
    couponCode: string | null;
  }> {
    if (!code?.trim()) {
      return {
        discount: new Prisma.Decimal(0),
        couponId: null,
        couponCode: null,
      };
    }
    if (plan === PlanType.STARTER) {
      throw new BadRequestException(
        'Los cupones están disponibles en planes Pro y Mayorista',
      );
    }
    const normalized = code.trim().toUpperCase();
    const c = await tx.coupon.findFirst({
      where: {
        tenant_id: tenantId,
        code: normalized,
        is_active: true,
        type: CouponType.PERCENTAGE,
      },
    });
    if (!c) {
      throw new BadRequestException('Cupón no válido');
    }
    const now = new Date();
    if (c.starts_at && c.starts_at > now) {
      throw new BadRequestException('Cupón aún no vigente');
    }
    if (c.expires_at && c.expires_at < now) {
      throw new BadRequestException('Cupón vencido');
    }
    if (c.max_uses != null && c.uses_count >= c.max_uses) {
      throw new BadRequestException('Cupón agotado');
    }
    const pct = Number(c.value);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      throw new BadRequestException('Cupón inválido');
    }
    const discount = subtotal.mul(pct).div(100);
    return {
      discount,
      couponId: c.id,
      couponCode: c.code,
    };
  }

  async checkout(slug: string, dto: CheckoutDto) {
    if (dto.accepts_marketplace_terms !== true) {
      throw new BadRequestException('Debés aceptar los términos de compra');
    }
    if (!dto.items?.length) {
      throw new BadRequestException('Agregá al menos un producto');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        plan: true,
        whatsapp_number: true,
        auto_whatsapp: true,
        notify_callmebot_apikey: true,
        notify_customer_order_email: true,
        smtp_host: true,
        smtp_port: true,
        smtp_secure: true,
        smtp_user: true,
        smtp_pass: true,
        smtp_from_email: true,
        smtp_from_name: true,
        status: true,
        points_enabled: true,
        points_ars_per_point: true,
        points_redeem_min_balance: true,
        points_redeem_percent: true,
        points_redeem_cost: true,
        billing_payment_alias: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tienda no encontrada');

    const phone = dto.customer_phone.trim();
    const trackUrl = `${storeBaseUrl()}/tienda/${tenant.slug}`;
    const tenantSmtp = tenantSmtpFromRow(tenant);

    const order = await this.prisma.$transaction(async (tx) => {
      const lines: {
        product: {
          id: string;
          name: string;
          price: Prisma.Decimal;
          track_stock: boolean;
        };
        qty: number;
      }[] = [];
      let subtotal = new Prisma.Decimal(0);

      for (const line of dto.items) {
        const product = await tx.product.findFirst({
          where: {
            tenant_id: tenant.id,
            slug: line.product_slug.trim(),
            is_active: true,
          },
        });
        if (!product) {
          throw new BadRequestException(`Producto no disponible: ${line.product_slug}`);
        }
        if (tenant.status === TenantStatus.SUSPENDED) {
          const allowed = await this.visibleProductIdsForSuspendedInTx(
            tx,
            tenant.id,
          );
          if (!allowed.has(product.id)) {
            throw new BadRequestException(`Producto no disponible: ${line.product_slug}`);
          }
        }
        if (product.track_stock && product.stock < line.quantity) {
          throw new BadRequestException(`Sin stock suficiente: ${product.name}`);
        }
        const unit = product.price;
        subtotal = subtotal.add(unit.mul(line.quantity));
        lines.push({ product, qty: line.quantity });
      }

      const { discount, couponId, couponCode } = await this.resolveStoreCouponTx(
        tx,
        tenant.id,
        tenant.plan,
        dto.coupon_code,
        subtotal,
      );
      const baseAfterCoupon = subtotal.sub(discount);
      if (baseAfterCoupon.lt(0)) {
        throw new BadRequestException('Total inválido');
      }

      let pointsRedeemDiscount = new Prisma.Decimal(0);
      const wantRedeem =
        dto.use_points_redeem === true &&
        tenant.plan !== PlanType.STARTER &&
        tenant.points_enabled === true;

      if (wantRedeem) {
        const minB = tenant.points_redeem_min_balance;
        const pctDec = tenant.points_redeem_percent;
        const cost = tenant.points_redeem_cost;
        const pct = pctDec != null ? Number(pctDec) : 0;
        if (minB == null || cost == null || cost < 1 || pct <= 0 || pct > 100) {
          throw new BadRequestException('Canje de puntos no disponible');
        }
        const existingCustomer = await tx.customer.findUnique({
          where: {
            tenant_id_phone: { tenant_id: tenant.id, phone },
          },
        });
        if (!existingCustomer || existingCustomer.points < minB) {
          throw new BadRequestException('No tenés puntos suficientes para este canje');
        }
        pointsRedeemDiscount = baseAfterCoupon.mul(pct).div(100);
        if (pointsRedeemDiscount.lt(0)) {
          pointsRedeemDiscount = new Prisma.Decimal(0);
        }
        if (pointsRedeemDiscount.gt(baseAfterCoupon)) {
          pointsRedeemDiscount = baseAfterCoupon;
        }
      }

      const totalDiscount = discount.add(pointsRedeemDiscount);
      const total = subtotal.sub(totalDiscount);
      if (total.lt(0)) {
        throw new BadRequestException('Total inválido');
      }

      const maxOrd = await tx.order.aggregate({
        where: { tenant_id: tenant.id },
        _max: { order_number: true },
      });
      const orderNumber = (maxOrd._max.order_number ?? 0) + 1;

      const customer = await tx.customer.upsert({
        where: {
          tenant_id_phone: { tenant_id: tenant.id, phone },
        },
        create: {
          tenant_id: tenant.id,
          phone,
          name: dto.customer_name.trim(),
          email: dto.customer_email?.trim() ?? null,
          total_orders: 1,
          last_order_at: new Date(),
          total_spent: total,
        },
        update: {
          name: dto.customer_name.trim(),
          ...(dto.customer_email?.trim()
            ? { email: dto.customer_email.trim() }
            : {}),
          total_orders: { increment: 1 },
          last_order_at: new Date(),
          total_spent: { increment: total },
        },
      });

      const created = await tx.order.create({
        data: {
          tenant_id: tenant.id,
          customer_id: customer.id,
          order_number: orderNumber,
          status: 'PENDING',
          customer_name: dto.customer_name.trim(),
          customer_phone: phone,
          customer_email: dto.customer_email?.trim() ?? null,
          delivery_type: dto.delivery_type ?? 'PICKUP',
          subtotal,
          total,
          discount_amount: totalDiscount,
          shipping_cost: new Prisma.Decimal(0),
          payment_status: 'PENDING',
          customer_notes: dto.customer_notes?.trim() ?? null,
          coupon_id: couponId,
          coupon_code: couponCode,
        },
      });

      if (wantRedeem && pointsRedeemDiscount.gt(0) && tenant.points_redeem_cost != null) {
        const cost = tenant.points_redeem_cost;
        await tx.customer.update({
          where: { id: customer.id },
          data: { points: { decrement: cost } },
        });
        await tx.pointTransaction.create({
          data: {
            customer_id: customer.id,
            points: cost,
            type: 'REDEEMED',
            description: `Canje de puntos en pedido #${orderNumber}`,
            order_id: created.id,
          },
        });
      }

      for (const { product, qty } of lines) {
        const unit = product.price;
        await tx.orderItem.create({
          data: {
            order_id: created.id,
            product_id: product.id,
            product_name: product.name,
            unit_price: unit,
            quantity: qty,
            subtotal: unit.mul(qty),
          },
        });
        if (product.track_stock) {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: qty } },
          });
        }
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { uses_count: { increment: 1 } },
        });
      }

      return created;
    });

    const items = await this.prisma.orderItem.findMany({
      where: { order_id: order.id },
      select: { product_name: true, quantity: true, subtotal: true },
    });

    this.orderNotifications.scheduleNotifyNewOrder({
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      tenantEmail: tenant.email,
      tenantPhone: tenant.phone,
      tenantWhatsapp: tenant.whatsapp_number,
      autoWhatsapp: tenant.auto_whatsapp,
      callmebotApikey: tenant.notify_callmebot_apikey,
      orderNumber: order.order_number,
      customerName: dto.customer_name.trim(),
      customerPhone: phone,
      customerEmail: dto.customer_email?.trim() ?? null,
      deliveryType: dto.delivery_type ?? 'PICKUP',
      notes: dto.customer_notes?.trim() ?? null,
      lines: items.map((i) => ({
        productName: i.product_name,
        quantity: i.quantity,
        subtotal: i.subtotal.toString(),
      })),
      total: order.total.toString(),
      trackUrl,
      tenantSmtp,
      notifyCustomerOrderEmail: tenant.notify_customer_order_email,
    });

    return {
      data: {
        order_id: order.id,
        order_number: order.order_number,
        subtotal: order.subtotal.toString(),
        discount_amount: order.discount_amount.toString(),
        total: order.total.toString(),
        billing_payment_alias: tenant.billing_payment_alias ?? null,
        message:
          'Pedido recibido. El comercio te va a contactar para coordinar el pago y la entrega.',
      },
    };
  }

  private async visibleProductIdsForSuspendedInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ) {
    const rows = await tx.product.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: [
        { is_featured: 'desc' },
        { sort_order: 'asc' },
        { created_at: 'desc' },
      ],
      select: { id: true },
      take: CATALOG_CAP_SUSPENDED,
    });
    return new Set(rows.map((r) => r.id));
  }

  async trackEvent(slug: string, dto: TrackEventDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { not: 'CANCELLED' } },
      select: { id: true, plan: true },
    });
    if (!tenant) throw new NotFoundException('Tienda no encontrada');
    if (
      dto.event === 'producto_vista' &&
      !productDetailViewsAnalyticsForPlan(tenant.plan)
    ) {
      return { ok: true };
    }
    await this.prisma.analyticsEvent.create({
      data: {
        tenant_id: tenant.id,
        event: dto.event,
        properties: (dto.properties ?? {}) as Prisma.InputJsonValue,
        session_id: dto.session_id ?? null,
      },
    });
    return { ok: true };
  }
}
