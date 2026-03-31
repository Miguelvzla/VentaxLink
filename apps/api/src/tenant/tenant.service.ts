import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanType, Prisma } from '@prisma/client';
import { OrderNotificationsService } from '../notifications/order-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const tenantMeSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  logo_url: true,
  banner_url: true,
  primary_color: true,
  secondary_color: true,
  phone: true,
  email: true,
  plan: true,
  status: true,
  whatsapp_number: true,
  address: true,
  instagram_url: true,
  facebook_url: true,
  tiktok_url: true,
  google_maps_url: true,
  auto_whatsapp: true,
  notify_customer_order_email: true,
  smtp_host: true,
  smtp_port: true,
  smtp_secure: true,
  smtp_user: true,
  smtp_from_email: true,
  smtp_from_name: true,
  points_enabled: true,
  points_ars_per_point: true,
  points_redeem_min_balance: true,
  points_redeem_percent: true,
  points_redeem_cost: true,
  created_at: true,
  plan_expires_at: true,
  billing_reminder_enabled: true,
  billing_reminder_day_of_month: true,
  billing_reminder_hour: true,
  billing_reminder_subject: true,
  billing_reminder_body: true,
  billing_payment_alias: true,
  last_billing_reminder_sent_at: true,
} as const;

const tenantMeDbSelect = {
  ...tenantMeSelect,
  notify_callmebot_apikey: true,
  smtp_pass: true,
} as const;

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderNotifications: OrderNotificationsService,
  ) {}

  private mapTenantMe(
    t: Prisma.TenantGetPayload<{ select: typeof tenantMeDbSelect }>,
  ) {
    const { notify_callmebot_apikey, smtp_pass, ...pub } = t;
    const hasKey = !!(
      notify_callmebot_apikey?.trim() ||
      process.env.CALLMEBOT_API_KEY?.trim()
    );
    const smtp_password_set = !!(smtp_pass && String(smtp_pass).length > 0);
    const smtp_configured = !!(
      pub.smtp_host?.trim() &&
      pub.smtp_from_email?.trim() &&
      (!pub.smtp_user?.trim() || smtp_password_set)
    );
    const ptsArs = pub.points_ars_per_point;
    const ptsPct = pub.points_redeem_percent;
    return {
      data: {
        ...pub,
        points_ars_per_point: ptsArs != null ? ptsArs.toString() : null,
        points_redeem_percent: ptsPct != null ? ptsPct.toString() : null,
        notify_whatsapp_configured: hasKey,
        smtp_password_set,
        smtp_configured,
      },
    };
  }

  async getMe(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: tenantMeDbSelect,
    });
    if (!t) throw new NotFoundException('Comercio no encontrado');
    return this.mapTenantMe(t);
  }

  async updateMe(tenantId: string, dto: UpdateTenantDto) {
    const data: Prisma.TenantUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.logo_url !== undefined) data.logo_url = dto.logo_url;
    if (dto.banner_url !== undefined) data.banner_url = dto.banner_url;
    if (dto.primary_color !== undefined) data.primary_color = dto.primary_color;
    if (dto.secondary_color !== undefined) data.secondary_color = dto.secondary_color;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.whatsapp_number !== undefined) data.whatsapp_number = dto.whatsapp_number;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.instagram_url !== undefined) data.instagram_url = dto.instagram_url;
    if (dto.facebook_url !== undefined) data.facebook_url = dto.facebook_url;
    if (dto.tiktok_url !== undefined) data.tiktok_url = dto.tiktok_url;
    if (dto.google_maps_url !== undefined) data.google_maps_url = dto.google_maps_url;
    if (dto.auto_whatsapp !== undefined) data.auto_whatsapp = dto.auto_whatsapp;
    if (dto.notify_customer_order_email !== undefined) {
      data.notify_customer_order_email = dto.notify_customer_order_email;
    }
    if (dto.smtp_host !== undefined) {
      const v = dto.smtp_host.trim();
      data.smtp_host = v.length ? v : null;
    }
    if (dto.smtp_port !== undefined) {
      data.smtp_port = dto.smtp_port;
    }
    if (dto.smtp_secure !== undefined) data.smtp_secure = dto.smtp_secure;
    if (dto.smtp_user !== undefined) {
      const v = dto.smtp_user.trim();
      data.smtp_user = v.length ? v : null;
    }
    if (dto.smtp_from_email !== undefined) {
      const v = dto.smtp_from_email.trim();
      data.smtp_from_email = v.length ? v : null;
    }
    if (dto.smtp_from_name !== undefined) {
      const v = dto.smtp_from_name.trim();
      data.smtp_from_name = v.length ? v : null;
    }
    if (dto.clear_smtp_credentials === true) {
      data.smtp_pass = null;
      data.smtp_user = null;
    } else if (dto.smtp_pass !== undefined) {
      const p = dto.smtp_pass.trim();
      data.smtp_pass = p.length ? p : null;
    }
    if (dto.clear_notify_callmebot_apikey === true) {
      data.notify_callmebot_apikey = null;
    } else if (dto.notify_callmebot_apikey !== undefined) {
      const k = dto.notify_callmebot_apikey.trim();
      data.notify_callmebot_apikey = k.length ? k : null;
    }
    if (dto.plan !== undefined) {
      data.plan = dto.plan as PlanType;
    }

    const cur = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        slug: true,
        name: true,
        email: true,
        billing_reminder_enabled: true,
        billing_reminder_day_of_month: true,
        billing_reminder_hour: true,
        billing_reminder_subject: true,
        billing_reminder_body: true,
        billing_payment_alias: true,
      },
    });
    const plan = cur?.plan ?? PlanType.STARTER;

    const effectivePlan =
      dto.plan !== undefined ? (dto.plan as PlanType) : plan;

    if (effectivePlan === PlanType.STARTER) {
      data.billing_reminder_enabled = false;
    } else {
      if (dto.billing_reminder_enabled !== undefined) {
        data.billing_reminder_enabled = dto.billing_reminder_enabled;
      }
      if (dto.billing_reminder_day_of_month !== undefined) {
        data.billing_reminder_day_of_month = dto.billing_reminder_day_of_month;
      }
      if (dto.billing_reminder_hour !== undefined) {
        data.billing_reminder_hour = dto.billing_reminder_hour;
      }
      if (dto.billing_reminder_subject !== undefined) {
        const s = dto.billing_reminder_subject?.trim();
        data.billing_reminder_subject = s?.length ? s : null;
      }
      if (dto.billing_reminder_body !== undefined) {
        const b = dto.billing_reminder_body?.trim();
        data.billing_reminder_body = b?.length ? b : null;
      }
      if (dto.billing_payment_alias !== undefined) {
        const a = dto.billing_payment_alias?.trim();
        data.billing_payment_alias = a?.length ? a : null;
      }
    }

    const mergedEnabled =
      effectivePlan === PlanType.STARTER
        ? false
        : (dto.billing_reminder_enabled !== undefined
            ? dto.billing_reminder_enabled
            : cur?.billing_reminder_enabled) ?? false;
    const mergedDay =
      dto.billing_reminder_day_of_month !== undefined
        ? dto.billing_reminder_day_of_month
        : cur?.billing_reminder_day_of_month;
    const mergedHour =
      dto.billing_reminder_hour !== undefined
        ? dto.billing_reminder_hour
        : cur?.billing_reminder_hour;
    const mergedSubject =
      dto.billing_reminder_subject !== undefined
        ? dto.billing_reminder_subject?.trim()
        : cur?.billing_reminder_subject ?? undefined;
    const mergedBody =
      dto.billing_reminder_body !== undefined
        ? dto.billing_reminder_body?.trim()
        : cur?.billing_reminder_body ?? undefined;
    const mergedAlias =
      dto.billing_payment_alias !== undefined
        ? dto.billing_payment_alias?.trim()
        : cur?.billing_payment_alias ?? undefined;

    if (mergedEnabled) {
      if (effectivePlan !== PlanType.PRO && effectivePlan !== PlanType.WHOLESALE) {
        throw new ForbiddenException(
          'El recordatorio de cobro solo está disponible en planes Pro y Mayorista',
        );
      }
      if (
        mergedDay == null ||
        mergedHour == null ||
        !mergedSubject ||
        !mergedBody ||
        !mergedAlias
      ) {
        throw new BadRequestException(
          'Completá día del mes (1–28), hora (0–23), asunto, descripción y datos de pago (alias/CBU)',
        );
      }
    }
    if (dto.points_enabled === true && effectivePlan === PlanType.STARTER) {
      throw new ForbiddenException(
        'El programa de puntos está disponible en planes Pro y Mayorista',
      );
    }
    if (dto.points_enabled !== undefined) {
      data.points_enabled = dto.points_enabled;
    }
    if (dto.points_ars_per_point !== undefined) {
      const v = dto.points_ars_per_point;
      data.points_ars_per_point =
        v != null && Number(v) > 0 ? new Prisma.Decimal(v) : null;
    }
    if (dto.points_redeem_min_balance !== undefined) {
      data.points_redeem_min_balance = dto.points_redeem_min_balance;
    }
    if (dto.points_redeem_percent !== undefined) {
      const v = dto.points_redeem_percent;
      data.points_redeem_percent =
        v != null && Number(v) > 0 ? new Prisma.Decimal(v) : null;
    }
    if (dto.points_redeem_cost !== undefined) {
      data.points_redeem_cost = dto.points_redeem_cost;
    }

    if (Object.keys(data).length === 0) {
      return this.getMe(tenantId);
    }

    try {
      const t = await this.prisma.tenant.update({
        where: { id: tenantId },
        data,
        select: tenantMeDbSelect,
      });
      if (
        dto.plan !== undefined &&
        cur &&
        cur.plan !== t.plan
      ) {
        this.orderNotifications.schedulePlanChangeEmail({
          tenantEmail: t.email,
          tenantName: t.name,
          slug: t.slug,
          oldPlan: cur.plan,
          newPlan: t.plan,
        });
      }
      return this.mapTenantMe(t);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ese email ya lo usa otro comercio');
      }
      throw e;
    }
  }
}
