import * as crypto from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlanType, Prisma, TenantStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { PlatformPatchTenantDto } from './dto/platform-patch-tenant.dto';

const MARKETPLACE_TERMS_KEY = 'marketplace_terms';
const DEFAULT_MARKETPLACE_TERMS =
  'VentaXLink provee la plataforma tecnológica para publicar tiendas online. La compra se realiza directamente al comercio vendedor, que es responsable por precios, stock, entrega, facturación y postventa.';

@Injectable()
export class PlatformTenantsService {
  private readonly logger = new Logger(PlatformTenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMarketplaceTerms() {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: MARKETPLACE_TERMS_KEY },
      select: { value: true, updated_at: true },
    });
    return {
      data: {
        terms: row?.value?.trim() || DEFAULT_MARKETPLACE_TERMS,
        updated_at: row?.updated_at?.toISOString() ?? null,
      },
    };
  }

  async patchMarketplaceTerms(terms: string) {
    const normalized = terms.trim();
    if (normalized.length < 40) {
      throw new BadRequestException(
        'Los términos deben tener al menos 40 caracteres',
      );
    }
    const row = await this.prisma.platformSetting.upsert({
      where: { key: MARKETPLACE_TERMS_KEY },
      create: { key: MARKETPLACE_TERMS_KEY, value: normalized },
      update: { value: normalized },
      select: { value: true, updated_at: true },
    });
    return {
      data: { terms: row.value, updated_at: row.updated_at.toISOString() },
    };
  }

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

  /**
   * Solo plataforma: asigna contraseña provisoria al usuario OWNER activo del comercio.
   * Invalida tokens de “olvidé contraseña”. La clave solo se devuelve una vez en la respuesta.
   */
  async resetOwnerPassword(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true, email: true },
    });
    if (!tenant) {
      throw new NotFoundException('Comercio no encontrado');
    }

    const owner = await this.prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        role: UserRole.OWNER,
        is_active: true,
      },
      select: { id: true, email: true, name: true },
    });
    if (!owner) {
      throw new NotFoundException(
        'No hay un titular (OWNER) activo en este comercio. El comercio puede usar “Olvidé mi contraseña” en el login del panel si tiene Resend configurado.',
      );
    }

    const temporaryPassword = `Vxl_${crypto.randomBytes(10).toString('base64url')}`;
    const password_hash = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { user_id: owner.id } }),
      this.prisma.user.update({
        where: { id: owner.id },
        data: { password_hash },
      }),
    ]);

    this.logger.warn(
      `[platform] reset contraseña titular tenant=${tenant.slug} owner=${owner.email.slice(0, 2)}…`,
    );

    return {
      data: {
        temporary_password: temporaryPassword,
        user_email: owner.email,
        user_name: owner.name,
        tenant_name: tenant.name,
        tenant_slug: tenant.slug,
        tenant_email: tenant.email,
        message:
          'Comunicá esta contraseña al comercio por un canal seguro. No podrás volver a verla en el sistema.',
      },
    };
  }
}
