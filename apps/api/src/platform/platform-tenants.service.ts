import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanType, Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PlatformPatchTenantDto } from './dto/platform-patch-tenant.dto';

@Injectable()
export class PlatformTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async patch(id: string, dto: PlatformPatchTenantDto) {
    const t = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        plan: true,
        billing_reminder_enabled: true,
        billing_reminder_day_of_month: true,
        billing_reminder_hour: true,
        billing_reminder_subject: true,
        billing_reminder_body: true,
        billing_payment_alias: true,
      },
    });
    if (!t) throw new NotFoundException('Comercio no encontrado');

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) {
      data.status =
        dto.status === 'SUSPENDED' ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
    }
    if (dto.billing_hold_message !== undefined) {
      const m = dto.billing_hold_message.trim();
      data.billing_hold_message = m.length ? m : null;
    }
    if (dto.plan_expires_at !== undefined) {
      data.plan_expires_at = dto.plan_expires_at
        ? new Date(dto.plan_expires_at)
        : null;
    }

    const effectivePlan = t.plan;
    if (effectivePlan === PlanType.STARTER) {
      if (dto.billing_reminder_enabled === true) {
        throw new BadRequestException(
          'El recordatorio de cobro solo aplica a planes Pro y Mayorista',
        );
      }
      if (
        dto.billing_reminder_day_of_month !== undefined ||
        dto.billing_reminder_hour !== undefined ||
        dto.billing_reminder_subject !== undefined ||
        dto.billing_reminder_body !== undefined ||
        dto.billing_payment_alias !== undefined
      ) {
        throw new BadRequestException(
          'No se pueden editar datos de recordatorio en plan Inicio',
        );
      }
      if (dto.billing_reminder_enabled === false) {
        data.billing_reminder_enabled = false;
      }
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
            : t.billing_reminder_enabled) ?? false;
    const mergedDay =
      dto.billing_reminder_day_of_month !== undefined
        ? dto.billing_reminder_day_of_month
        : t.billing_reminder_day_of_month;
    const mergedHour =
      dto.billing_reminder_hour !== undefined
        ? dto.billing_reminder_hour
        : t.billing_reminder_hour;
    const mergedSubject =
      dto.billing_reminder_subject !== undefined
        ? dto.billing_reminder_subject?.trim()
        : t.billing_reminder_subject ?? undefined;
    const mergedBody =
      dto.billing_reminder_body !== undefined
        ? dto.billing_reminder_body?.trim()
        : t.billing_reminder_body ?? undefined;
    const mergedAlias =
      dto.billing_payment_alias !== undefined
        ? dto.billing_payment_alias?.trim()
        : t.billing_payment_alias ?? undefined;

    if (mergedEnabled) {
      if (effectivePlan !== PlanType.PRO && effectivePlan !== PlanType.WHOLESALE) {
        throw new BadRequestException(
          'El recordatorio de cobro solo aplica a planes Pro y Mayorista',
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
          'Con el recordatorio activo: día (1–28), hora (0–23), asunto, cuerpo y datos de pago son obligatorios',
        );
      }
    }

    if (Object.keys(data).length === 0) {
      const row = await this.prisma.tenant.findUnique({
        where: { id },
        select: this.platformTenantSelect,
      });
      return { data: row };
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: data as Prisma.TenantUpdateInput,
      select: this.platformTenantSelect,
    });
    return { data: updated };
  }

  private readonly platformTenantSelect = {
    id: true,
    slug: true,
    name: true,
    email: true,
    phone: true,
    plan: true,
    status: true,
    billing_hold_message: true,
    plan_expires_at: true,
    created_at: true,
    trial_ends_at: true,
    billing_reminder_enabled: true,
    billing_reminder_day_of_month: true,
    billing_reminder_hour: true,
    billing_reminder_subject: true,
    billing_reminder_body: true,
    billing_payment_alias: true,
    last_billing_reminder_sent_at: true,
    updated_at: true,
  } as const;

  async list(q?: string) {
    const term = q?.trim();
    const where =
      term && term.length > 0
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' as const } },
              { email: { contains: term, mode: 'insensitive' as const } },
              { phone: { contains: term, mode: 'insensitive' as const } },
              { slug: { contains: term, mode: 'insensitive' as const } },
              {
                users: {
                  some: {
                    OR: [
                      {
                        name: {
                          contains: term,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        email: {
                          contains: term,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {};

    const rows = await this.prisma.tenant.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        phone: true,
        plan: true,
        status: true,
        created_at: true,
        trial_ends_at: true,
        plan_expires_at: true,
        billing_hold_message: true,
        billing_reminder_enabled: true,
        billing_reminder_day_of_month: true,
        billing_reminder_hour: true,
        billing_reminder_subject: true,
        billing_reminder_body: true,
        billing_payment_alias: true,
        last_billing_reminder_sent_at: true,
        _count: {
          select: {
            products: true,
            users: true,
            orders: true,
          },
        },
      },
    });

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) {
      return { data: [] };
    }

    const [visitGroups, loginGroups] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({
        by: ['tenant_id'],
        where: { tenant_id: { in: ids }, event: 'tienda_vista' },
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['tenant_id'],
        where: { tenant_id: { in: ids } },
        _max: { last_login: true },
      }),
    ]);

    const visitsByTenant = new Map(
      visitGroups.map((g) => [g.tenant_id, g._count.id]),
    );
    const lastLoginByTenant = new Map(
      loginGroups.map((g) => [g.tenant_id, g._max.last_login]),
    );

    return {
      data: rows.map((row) => {
        const last = lastLoginByTenant.get(row.id);
        return {
          ...row,
          store_visit_count: visitsByTenant.get(row.id) ?? 0,
          last_panel_login_at: last ? last.toISOString() : null,
        };
      }),
    };
  }
}
