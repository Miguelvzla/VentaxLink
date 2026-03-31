import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlanType, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { TenantSmtpForMail } from './order-notifications.service';
import { OrderNotificationsService } from './order-notifications.service';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function applyTemplate(
  text: string,
  vars: Record<string, string>,
): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Suma un mes calendario (misma hora relativa; Feb 31 → Mar 3 en JS). */
function addOneCalendarMonth(from: Date): Date {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + 1);
  return d;
}

@Injectable()
export class BillingReminderService {
  private readonly logger = new Logger(BillingReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderNotifications: OrderNotificationsService,
  ) {}

  /**
   * Cada hora en el minuto 0:
   * - Pro / Mayorista activos o en prueba: si coincide día/hora (o 1 y 9 por defecto),
   *   renueva `plan_expires_at` un mes (una vez por mes calendario).
   * - Si además tienen recordatorio de cobro y SMTP, envía el mail.
   */
  @Cron('0 * * * *')
  async handleHourly(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDate();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const tenants = await this.prisma.tenant.findMany({
      where: {
        plan: { in: [PlanType.PRO, PlanType.WHOLESALE] },
        status: { in: [TenantStatus.ACTIVE, TenantStatus.TRIAL] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        plan_expires_at: true,
        billing_reminder_enabled: true,
        billing_reminder_day_of_month: true,
        billing_reminder_hour: true,
        billing_reminder_subject: true,
        billing_reminder_body: true,
        billing_payment_alias: true,
        last_billing_reminder_sent_at: true,
        last_plan_expiry_rolled_at: true,
        smtp_host: true,
        smtp_port: true,
        smtp_secure: true,
        smtp_user: true,
        smtp_pass: true,
        smtp_from_email: true,
        smtp_from_name: true,
      },
    });

    for (const t of tenants) {
      const rollDay = t.billing_reminder_day_of_month ?? 1;
      const rollHour = t.billing_reminder_hour ?? 9;
      if (rollDay !== day || rollHour !== hour) {
        continue;
      }

      const alreadyRolledThisMonth =
        t.last_plan_expiry_rolled_at != null &&
        t.last_plan_expiry_rolled_at >= startOfMonth;

      let planExpiresForMail: Date | null = t.plan_expires_at;
      if (!alreadyRolledThisMonth) {
        const base = t.plan_expires_at ?? startOfDay(now);
        const nextExpiry = addOneCalendarMonth(base);
        planExpiresForMail = nextExpiry;
        await this.prisma.tenant.update({
          where: { id: t.id },
          data: {
            plan_expires_at: nextExpiry,
            last_plan_expiry_rolled_at: now,
          },
        });
        this.logger.log(
          `Plan vencimiento +1 mes — ${t.name} (${t.id}) → ${nextExpiry.toISOString()}`,
        );
      }

      if (!t.billing_reminder_enabled) {
        continue;
      }

      if (
        t.last_billing_reminder_sent_at &&
        t.last_billing_reminder_sent_at >= startOfMonth
      ) {
        continue;
      }
      const to = t.email?.trim();
      if (!to) continue;

      const subj = t.billing_reminder_subject?.trim();
      const body = t.billing_reminder_body?.trim();
      const alias = t.billing_payment_alias?.trim();
      if (!subj || !body || !alias) {
        this.logger.warn(
          `Tenant ${t.id}: recordatorio habilitado pero faltan asunto/cuerpo/alias`,
        );
        continue;
      }

      const planVence = planExpiresForMail
        ? planExpiresForMail.toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '—';

      const vars: Record<string, string> = {
        comercio: t.name,
        alias,
        pago: alias,
        plan_vence: planVence,
        mes: now.toLocaleString('es-AR', { month: 'long', year: 'numeric' }),
      };

      const text = applyTemplate(body, vars);
      const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(text)}</pre>
</body></html>`;

      const smtp = tenantSmtpFromRow(t);
      const ok = await this.orderNotifications.sendBillingReminderEmail({
        toEmail: to,
        tenantSmtp: smtp,
        subject: applyTemplate(subj, vars),
        text,
        html,
      });

      if (ok) {
        await this.prisma.tenant.update({
          where: { id: t.id },
          data: { last_billing_reminder_sent_at: new Date() },
        });
      }
    }
  }

  /**
   * Diario 8:00 (hora del servidor): aviso de renovación entre 1 y N días antes de `plan_expires_at`.
   * Reintenta cada día hasta enviar (si falla SMTP) mientras siga en la ventana.
   */
  @Cron('0 8 * * *')
  async handlePlanExpiryWarningDaily(): Promise<void> {
    const raw = Number(process.env.PLAN_EXPIRY_WARNING_DAYS || 7);
    const warnDays = Number.isFinite(raw) ? Math.min(60, Math.max(1, Math.floor(raw))) : 7;
    const now = new Date();

    const tenants = await this.prisma.tenant.findMany({
      where: {
        plan: { in: [PlanType.PRO, PlanType.WHOLESALE] },
        status: { in: [TenantStatus.ACTIVE, TenantStatus.TRIAL] },
        plan_expires_at: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        plan_expires_at: true,
        plan_expiry_warning_sent_for: true,
        smtp_host: true,
        smtp_port: true,
        smtp_secure: true,
        smtp_user: true,
        smtp_pass: true,
        smtp_from_email: true,
        smtp_from_name: true,
      },
    });

    for (const t of tenants) {
      const exp = t.plan_expires_at!;
      const to = t.email?.trim();
      if (!to) continue;

      const daysUntil = Math.round(
        (startOfDay(exp).getTime() - startOfDay(now).getTime()) / 86_400_000,
      );
      if (daysUntil < 1 || daysUntil > warnDays) continue;

      if (
        t.plan_expiry_warning_sent_for &&
        t.plan_expiry_warning_sent_for.getTime() === exp.getTime()
      ) {
        continue;
      }

      const smtp = tenantSmtpFromRow(t);
      const ok = await this.orderNotifications.sendPlanExpiryWarningEmail({
        tenantEmail: to,
        tenantName: t.name,
        slug: t.slug,
        planExpiresAt: exp,
        tenantSmtp: smtp,
      });
      if (ok) {
        await this.prisma.tenant.update({
          where: { id: t.id },
          data: { plan_expiry_warning_sent_for: exp },
        });
        this.logger.log(
          `Aviso vencimiento plan enviado — ${t.name} (${t.id}), faltan ${daysUntil} días`,
        );
      }
    }
  }
}
