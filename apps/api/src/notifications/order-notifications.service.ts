import { Injectable, Logger } from '@nestjs/common';
import { DeliveryType, PlanType } from '@prisma/client';
import * as nodemailer from 'nodemailer';

export type OrderNotifyLine = {
  productName: string;
  quantity: number;
  subtotal: string;
};

/** SMTP del comercio (si está completo, reemplaza al SMTP global para estos envíos). */
export type TenantSmtpForMail = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  fromEmail: string;
  fromName: string | null;
};

export type OrderNotifyPayload = {
  tenantName: string;
  tenantSlug: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantWhatsapp: string | null;
  autoWhatsapp: boolean;
  callmebotApikey: string | null;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryType: DeliveryType;
  notes: string | null;
  lines: OrderNotifyLine[];
  total: string;
  /** URL pública para que el cliente ubique la tienda / pedido */
  trackUrl: string;
  /** Si el comercio configuró SMTP propio */
  tenantSmtp: TenantSmtpForMail | null;
  /** Enviar copia al cliente con el nº de pedido (requiere email del cliente y SMTP del comercio) */
  notifyCustomerOrderEmail: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function deliveryLabel(d: DeliveryType): string {
  return d === 'DELIVERY' ? 'Envío a domicilio' : 'Retiro en el local';
}

function planLabel(p: PlanType): string {
  if (p === PlanType.PRO) return 'Pro';
  if (p === PlanType.WHOLESALE) return 'Mayorista';
  return 'Inicio';
}

function internalNotifyRecipients(): string[] {
  const raw =
    process.env.INTERNAL_NOTIFY_EMAILS?.trim() ||
    process.env.INTERNAL_NOTIFY_EMAIL?.trim() ||
    '';
  return raw
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function storePublicUrl(slug: string): string {
  const base = (process.env.PUBLIC_STORE_URL || 'http://localhost:3003').replace(
    /\/+$/,
    '',
  );
  return `${base}/tienda/${encodeURIComponent(slug)}`;
}

function adminPanelUrl(): string {
  return (process.env.PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL || '')
    .trim()
    .replace(/\/+$/, '') || 'http://localhost:3002';
}

@Injectable()
export class OrderNotificationsService {
  private readonly logger = new Logger(OrderNotificationsService.name);

  scheduleNotifyNewOrder(payload: OrderNotifyPayload): void {
    void this.notifyNewOrder(payload).catch((err) => {
      this.logger.warn(
        `Aviso de pedido #${payload.orderNumber} incompleto: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  private async notifyNewOrder(p: OrderNotifyPayload): Promise<void> {
    await Promise.allSettled([
      this.sendMerchantEmail(p),
      this.sendCustomerEmailIfNeeded(p),
      this.sendCallMeBotIfConfigured(p),
    ]);
  }

  private isGlobalSmtpConfigured(): boolean {
    return !!(process.env.SMTP_HOST?.trim() && process.env.MAIL_FROM?.trim());
  }

  /** Formulario soporte: SMTP global + bandeja destino */
  contactFormReady(): boolean {
    const inbox =
      process.env.CONTACT_FORM_TO_EMAIL?.trim() ||
      process.env.SUPPORT_INBOX_EMAIL?.trim();
    return this.isGlobalSmtpConfigured() && !!inbox;
  }

  private createTransporter(tenantSmtp: TenantSmtpForMail | null) {
    if (tenantSmtp) {
      return nodemailer.createTransport({
        host: tenantSmtp.host,
        port: tenantSmtp.port,
        secure: tenantSmtp.secure,
        auth:
          tenantSmtp.user && tenantSmtp.pass
            ? { user: tenantSmtp.user, pass: tenantSmtp.pass }
            : undefined,
      });
    }
    if (!this.isGlobalSmtpConfigured()) return null;
    const port = Number(process.env.SMTP_PORT || '587');
    const secure =
      process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true';
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }

  private mailFrom(tenantSmtp: TenantSmtpForMail | null): string {
    if (tenantSmtp?.fromEmail) {
      return tenantSmtp.fromName
        ? `"${tenantSmtp.fromName.replace(/"/g, '')}" <${tenantSmtp.fromEmail}>`
        : tenantSmtp.fromEmail;
    }
    return process.env.MAIL_FROM!.trim();
  }

  /** Recordatorio mensual de cobro al email del comercio (SMTP del comercio o global). */
  async sendBillingReminderEmail(params: {
    toEmail: string;
    tenantSmtp: TenantSmtpForMail | null;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    const transporter = this.createTransporter(params.tenantSmtp);
    if (!transporter) {
      this.logger.warn(
        `Recordatorio de cobro: sin SMTP configurado; no se envía mail a ${params.toEmail}`,
      );
      return false;
    }
    const from = this.mailFrom(params.tenantSmtp);
    await transporter.sendMail({
      from,
      to: params.toEmail.trim(),
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    this.logger.log(`Recordatorio de cobro enviado a ${params.toEmail}`);
    return true;
  }

  private async sendMerchantEmail(p: OrderNotifyPayload): Promise<void> {
    const transporter = this.createTransporter(p.tenantSmtp);
    if (!transporter) {
      this.logger.debug(
        'Sin SMTP (ni del comercio ni global): se omite email al comercio',
      );
      return;
    }
    const from = this.mailFrom(p.tenantSmtp);
    const subject = `[VentaXLink] Nuevo pedido #${p.orderNumber} — ${p.tenantName}`;
    await transporter.sendMail({
      from,
      to: p.tenantEmail,
      replyTo: p.customerEmail || undefined,
      subject,
      text: this.buildPlainText(p),
      html: this.buildHtml(p),
    });
    this.logger.log(`Email de pedido #${p.orderNumber} enviado a ${p.tenantEmail}`);
  }

  private async sendCustomerEmailIfNeeded(p: OrderNotifyPayload): Promise<void> {
    if (!p.notifyCustomerOrderEmail || !p.customerEmail?.trim()) {
      this.logger.debug('Aviso por mail al cliente desactivado o sin email');
      return;
    }
    if (!p.tenantSmtp) {
      this.logger.debug(
        'El comercio no tiene SMTP propio configurado: no se envía mail al cliente (configurá SMTP en el panel)',
      );
      return;
    }
    const transporter = this.createTransporter(p.tenantSmtp);
    if (!transporter) return;
    const from = this.mailFrom(p.tenantSmtp);
    const subject = `Pedido #${p.orderNumber} — ${p.tenantName}`;
    const text = [
      `Hola ${p.customerName},`,
      ``,
      `Recibimos tu pedido #${p.orderNumber} en ${p.tenantName}.`,
      `Total: $${p.total}`,
      ``,
      `Podés ver la tienda y tus datos de contacto acá:`,
      p.trackUrl,
      ``,
      `El comercio se va a comunicar con vos para coordinar pago y entrega.`,
    ].join('\n');
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hola ${escapeHtml(p.customerName)},</p>
<p>Recibimos tu <strong>pedido #${p.orderNumber}</strong> en <strong>${escapeHtml(p.tenantName)}</strong>.</p>
<p style="font-size:18px"><strong>Total: $${escapeHtml(p.total)}</strong></p>
<p><a href="${escapeHtml(p.trackUrl)}">Ir a la tienda</a></p>
<p style="color:#666;font-size:14px">El comercio te contactará para coordinar pago y entrega.</p>
</body></html>`;
    await transporter.sendMail({
      from,
      to: p.customerEmail.trim(),
      subject,
      text,
      html,
    });
    this.logger.log(
      `Email de confirmación pedido #${p.orderNumber} enviado al cliente ${p.customerEmail}`,
    );
  }

  private buildPlainText(p: OrderNotifyPayload): string {
    const lines = p.lines
      .map((l) => `- ${l.productName} × ${l.quantity} → $${l.subtotal}`)
      .join('\n');
    return [
      `Nuevo pedido en tu tienda "${p.tenantName}" (slug: ${p.tenantSlug})`,
      ``,
      `Pedido #${p.orderNumber}`,
      `Cliente: ${p.customerName}`,
      `Teléfono: ${p.customerPhone}`,
      p.customerEmail ? `Email cliente: ${p.customerEmail}` : null,
      `Entrega: ${deliveryLabel(p.deliveryType)}`,
      p.notes ? `Notas del cliente: ${p.notes}` : null,
      ``,
      `Ítems:`,
      lines,
      ``,
      `Total: $${p.total}`,
      ``,
      `Enlace tienda: ${p.trackUrl}`,
      ``,
      `Podés gestionar el estado del pedido en el panel de administración.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildHtml(p: OrderNotifyPayload): string {
    const rows = p.lines
      .map(
        (l) =>
          `<tr><td>${escapeHtml(l.productName)}</td><td style="text-align:center">${l.quantity}</td><td style="text-align:right">$${escapeHtml(l.subtotal)}</td></tr>`,
      )
      .join('');
    return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<h2 style="margin:0 0 12px">Nuevo pedido #${p.orderNumber}</h2>
<p style="margin:0 0 8px"><strong>${escapeHtml(p.tenantName)}</strong></p>
<p style="margin:0 0 16px;color:#555">Tienda: <code>${escapeHtml(p.tenantSlug)}</code></p>
<table style="border-collapse:collapse;margin:16px 0">
<tr><td style="padding:4px 12px 4px 0;color:#555">Cliente</td><td>${escapeHtml(p.customerName)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#555">Teléfono</td><td>${escapeHtml(p.customerPhone)}</td></tr>
${p.customerEmail ? `<tr><td style="padding:4px 12px 4px 0;color:#555">Email</td><td>${escapeHtml(p.customerEmail)}</td></tr>` : ''}
<tr><td style="padding:4px 12px 4px 0;color:#555">Entrega</td><td>${escapeHtml(deliveryLabel(p.deliveryType))}</td></tr>
${p.notes ? `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top">Notas</td><td>${escapeHtml(p.notes)}</td></tr>` : ''}
</table>
<table style="width:100%;max-width:480px;border-collapse:collapse;margin-top:16px">
<thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left;padding:8px 0">Producto</th><th style="padding:8px 0">Cant.</th><th style="text-align:right;padding:8px 0">Subtotal</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="margin-top:20px;font-size:18px"><strong>Total: $${escapeHtml(p.total)}</strong></p>
<p><a href="${escapeHtml(p.trackUrl)}">Abrir tienda pública</a></p>
<p style="color:#666;font-size:14px">Gestioná el pedido desde el panel VentaXLink.</p>
</body></html>`;
  }

  private async sendCallMeBotIfConfigured(p: OrderNotifyPayload): Promise<void> {
    if (!p.autoWhatsapp) {
      this.logger.debug('auto_whatsapp desactivado: se omite WhatsApp al comercio');
      return;
    }
    const apikey =
      (p.callmebotApikey && p.callmebotApikey.trim()) ||
      process.env.CALLMEBOT_API_KEY?.trim() ||
      null;
    if (!apikey) {
      this.logger.debug(
        'CallMeBot no configurado (clave del comercio ni CALLMEBOT_API_KEY): se omite WhatsApp',
      );
      return;
    }
    const phone = this.normalizeWhatsappDestination(p.tenantWhatsapp || p.tenantPhone);
    if (!phone) {
      this.logger.warn('No hay teléfono válido del comercio para WhatsApp');
      return;
    }
    const text = this.buildWhatsAppText(p);
    const url =
      `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(text)}` +
      `&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url);
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`CallMeBot HTTP ${res.status}: ${body.slice(0, 240)}`);
    }
    this.logger.log(`WhatsApp (CallMeBot) pedido #${p.orderNumber} → ${phone}`);
  }

  normalizeWhatsappDestination(raw: string): string | null {
    const d = raw.replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('54')) return d;
    if (d.length >= 8 && d.length <= 11) return `54${d}`;
    return d;
  }

  private buildWhatsAppText(p: OrderNotifyPayload): string {
    const lines = p.lines.map((l) => `• ${l.productName} x${l.quantity} $${l.subtotal}`);
    return [
      `*Nuevo pedido #${p.orderNumber}* — ${p.tenantName}`,
      `Cliente: ${p.customerName}`,
      `Tel: ${p.customerPhone}`,
      p.customerEmail ? `Email: ${p.customerEmail}` : '',
      `Entrega: ${deliveryLabel(p.deliveryType)}`,
      p.notes ? `Notas: ${p.notes}` : '',
      '',
      ...lines,
      '',
      `*Total: $${p.total}*`,
      '',
      p.trackUrl,
    ]
      .filter((x) => x !== '')
      .join('\n');
  }

  /**
   * Correos de plataforma (bienvenida, internos, contacto): solo SMTP global (MAIL_FROM + SMTP_*).
   */
  async sendPlatformEmail(params: {
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
  }): Promise<boolean> {
    if (!this.isGlobalSmtpConfigured()) {
      this.logger.warn(
        'Correo de plataforma: falta SMTP_HOST y MAIL_FROM; no se envía',
      );
      return false;
    }
    const transporter = this.createTransporter(null);
    if (!transporter) return false;
    const from = this.mailFrom(null);
    await transporter.sendMail({
      from,
      to: params.to.trim(),
      replyTo: params.replyTo?.trim() || undefined,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  }

  scheduleRegistrationEmails(payload: {
    tenantEmail: string;
    tenantName: string;
    slug: string;
    phone: string;
    plan: PlanType;
    ownerName: string;
  }): void {
    void this.sendRegistrationEmails(payload).catch((err) => {
      this.logger.warn(
        `Mails de registro incompletos: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  private async sendRegistrationEmails(payload: {
    tenantEmail: string;
    tenantName: string;
    slug: string;
    phone: string;
    plan: PlanType;
    ownerName: string;
  }): Promise<void> {
    const url = storePublicUrl(payload.slug);
    const plan = planLabel(payload.plan);
    const welcomeSubject = `¡Bienvenido/a a VentaXLink, ${payload.tenantName}!`;
    const welcomeText = [
      `Hola ${payload.ownerName},`,
      ``,
      `Tu tienda "${payload.tenantName}" ya está creada con el link ${payload.slug}.`,
      `Plan elegido: ${plan}.`,
      ``,
      `Podés entrar al panel: ${adminPanelUrl()}/login`,
      `Tienda pública: ${url}`,
      ``,
      `Si necesitás ayuda, escribinos desde el panel (Soporte comercial en planes Pro/Mayorista).`,
      ``,
      `— Equipo VentaXLink`,
    ].join('\n');
    const welcomeHtml = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p>Hola ${escapeHtml(payload.ownerName)},</p>
<p>Tu tienda <strong>${escapeHtml(payload.tenantName)}</strong> ya está creada (link <code>${escapeHtml(payload.slug)}</code>).</p>
<p>Plan: <strong>${escapeHtml(plan)}</strong>.</p>
<p><a href="${escapeHtml(adminPanelUrl())}/login">Ir al panel</a> · <a href="${escapeHtml(url)}">Ver tienda pública</a></p>
<p style="color:#666;font-size:14px">— VentaXLink</p>
</body></html>`;

    const welcomeOk = await this.sendPlatformEmail({
      to: payload.tenantEmail,
      subject: welcomeSubject,
      text: welcomeText,
      html: welcomeHtml,
    });
    if (!welcomeOk) {
      this.logger.warn(
        `Mail de bienvenida no enviado a ${payload.tenantEmail}: falta SMTP global (SMTP_HOST + MAIL_FROM) en el proceso de la API`,
      );
    } else {
      this.logger.log(`Mail de bienvenida enviado a ${payload.tenantEmail}`);
    }

    const internals = internalNotifyRecipients();
    if (internals.length === 0) {
      this.logger.debug(
        'INTERNAL_NOTIFY_EMAILS no configurado: se omite aviso interno de registro',
      );
      return;
    }
    const internalSubject = `[VentaXLink] Nuevo comercio: ${payload.tenantName}`;
    const internalText = [
      `Se registró un nuevo comercio.`,
      ``,
      `Nombre: ${payload.tenantName}`,
      `Slug: ${payload.slug}`,
      `Email: ${payload.tenantEmail}`,
      `Teléfono: ${payload.phone}`,
      `Plan: ${plan}`,
      `Titular: ${payload.ownerName}`,
      ``,
      `Tienda: ${url}`,
    ].join('\n');
    const internalHtml = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p><strong>Nuevo registro</strong></p>
<ul>
<li>Comercio: ${escapeHtml(payload.tenantName)}</li>
<li>Slug: <code>${escapeHtml(payload.slug)}</code></li>
<li>Email: ${escapeHtml(payload.tenantEmail)}</li>
<li>Tel: ${escapeHtml(payload.phone)}</li>
<li>Plan: ${escapeHtml(plan)}</li>
<li>Titular: ${escapeHtml(payload.ownerName)}</li>
</ul>
<p><a href="${escapeHtml(url)}">Abrir tienda</a></p>
</body></html>`;
    for (const to of internals) {
      await this.sendPlatformEmail({
        to,
        subject: internalSubject,
        text: internalText,
        html: internalHtml,
      });
    }
  }

  scheduleCommercialContact(payload: {
    name: string;
    commerce: string;
    message: string;
    replyEmail?: string;
  }): void {
    void this.sendCommercialContact(payload).catch((err) => {
      this.logger.warn(
        `Contacto comercial no enviado: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  /** Envío síncrono para HTTP: devuelve false si no hay bandeja o SMTP global. */
  async sendCommercialContactSync(payload: {
    name: string;
    commerce: string;
    message: string;
    replyEmail?: string;
  }): Promise<boolean> {
    return this.sendCommercialContact(payload);
  }

  private async sendCommercialContact(payload: {
    name: string;
    commerce: string;
    message: string;
    replyEmail?: string;
  }): Promise<boolean> {
    const to =
      process.env.CONTACT_FORM_TO_EMAIL?.trim() ||
      process.env.SUPPORT_INBOX_EMAIL?.trim() ||
      '';
    if (!to) {
      this.logger.warn(
        'CONTACT_FORM_TO_EMAIL no configurado: no se envía el formulario de contacto',
      );
      return false;
    }
    const subject = `Contacto comercial — ${payload.commerce || 'sin comercio'}`;
    const text = [
      `Nombre: ${payload.name}`,
      `Comercio: ${payload.commerce || '—'}`,
      payload.replyEmail ? `Responder a: ${payload.replyEmail}` : '',
      ``,
      payload.message,
    ]
      .filter(Boolean)
      .join('\n');
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p><strong>Contacto comercial</strong></p>
<p>Nombre: ${escapeHtml(payload.name)}<br/>
Comercio: ${escapeHtml(payload.commerce || '—')}</p>
${payload.replyEmail ? `<p>Responder a: ${escapeHtml(payload.replyEmail)}</p>` : ''}
<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(payload.message)}</pre>
</body></html>`;
    const primaryOk = await this.sendPlatformEmail({
      to,
      subject,
      text,
      html,
      replyTo: payload.replyEmail,
    });
    if (!primaryOk) {
      this.logger.warn(
        `Contacto comercial no enviado a ${to}: falta SMTP global (SMTP_HOST + MAIL_FROM)`,
      );
      return false;
    }
    this.logger.log(`Contacto comercial enviado a ${to}`);

    const primaryLower = to.toLowerCase();
    const internals = internalNotifyRecipients().filter(
      (e) => e.toLowerCase() !== primaryLower,
    );
    const copySubject = `[Copia] ${subject}`;
    for (const inbox of internals) {
      await this.sendPlatformEmail({
        to: inbox,
        subject: copySubject,
        text,
        html,
        replyTo: payload.replyEmail,
      });
    }
    return true;
  }

  schedulePlanChangeEmail(payload: {
    tenantEmail: string;
    tenantName: string;
    slug: string;
    oldPlan: PlanType;
    newPlan: PlanType;
  }): void {
    if (payload.oldPlan === payload.newPlan) return;
    void this.sendPlanChangeEmails(payload).catch((err) => {
      this.logger.warn(
        `Mails de cambio de plan incompletos: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  private async sendPlanChangeEmails(payload: {
    tenantEmail: string;
    tenantName: string;
    slug: string;
    oldPlan: PlanType;
    newPlan: PlanType;
  }): Promise<void> {
    const url = storePublicUrl(payload.slug);
    const fromL = planLabel(payload.oldPlan);
    const toL = planLabel(payload.newPlan);
    const subject = `[VentaXLink] Cambio de plan: ${payload.tenantName} (${fromL} → ${toL})`;
    const bodyText = [
      `Hola,`,
      ``,
      `Actualizamos tu plan de "${fromL}" a "${toL}" para la tienda "${payload.tenantName}".`,
      ``,
      `Panel: ${adminPanelUrl()}/login`,
      `Tienda: ${url}`,
      ``,
      `Si no pediste este cambio, contactanos.`,
    ].join('\n');
    const bodyHtml = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p>Tu plan pasó de <strong>${escapeHtml(fromL)}</strong> a <strong>${escapeHtml(toL)}</strong> para <strong>${escapeHtml(payload.tenantName)}</strong>.</p>
<p><a href="${escapeHtml(adminPanelUrl())}/login">Panel</a> · <a href="${escapeHtml(url)}">Tienda</a></p>
</body></html>`;

    await this.sendPlatformEmail({
      to: payload.tenantEmail,
      subject: `[VentaXLink] Tu plan ahora es ${toL}`,
      text: bodyText,
      html: bodyHtml,
    });

    const internals = internalNotifyRecipients();
    if (internals.length === 0) return;
    const internalText = [
      `Cambio de plan en comercio registrado.`,
      ``,
      `Comercio: ${payload.tenantName}`,
      `Slug: ${payload.slug}`,
      `Email: ${payload.tenantEmail}`,
      `Antes: ${fromL} → Ahora: ${toL}`,
      ``,
      url,
    ].join('\n');
    const internalHtml = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p><strong>Cambio de plan</strong></p>
<ul>
<li>${escapeHtml(payload.tenantName)} (<code>${escapeHtml(payload.slug)}</code>)</li>
<li>${escapeHtml(payload.tenantEmail)}</li>
<li>${escapeHtml(fromL)} → ${escapeHtml(toL)}</li>
</ul>
<p><a href="${escapeHtml(url)}">Tienda</a></p>
</body></html>`;
    for (const to of internals) {
      await this.sendPlatformEmail({
        to,
        subject,
        text: internalText,
        html: internalHtml,
      });
    }
  }

  /** Aviso al comercio X días antes de plan_expires_at (usa SMTP del tenant o global). */
  async sendPlanExpiryWarningEmail(payload: {
    tenantEmail: string;
    tenantName: string;
    slug: string;
    planExpiresAt: Date;
    tenantSmtp: TenantSmtpForMail | null;
  }): Promise<boolean> {
    const to = payload.tenantEmail.trim();
    const fecha = payload.planExpiresAt.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const url = storePublicUrl(payload.slug);
    const panel = adminPanelUrl();
    const subject = `[VentaXLink] Tu plan vence pronto (${fecha})`;
    const text = [
      `Hola,`,
      ``,
      `Te recordamos que la fecha de renovación de tu plan para "${payload.tenantName}" es el ${fecha}.`,
      ``,
      `Tienda: ${url}`,
      `Panel: ${panel}/login`,
      ``,
      `Si ya abonaste, podés ignorar este mensaje.`,
    ].join('\n');
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p>Hola,</p>
<p>La renovación de tu plan para <strong>${escapeHtml(payload.tenantName)}</strong> está prevista para el <strong>${escapeHtml(fecha)}</strong>.</p>
<p><a href="${escapeHtml(url)}">Ver tienda</a> · <a href="${escapeHtml(panel)}/login">Panel</a></p>
<p style="color:#666;font-size:14px">Si ya pagaste, ignorá este aviso.</p>
</body></html>`;

    const ok = await this.sendBillingReminderEmail({
      toEmail: to,
      tenantSmtp: payload.tenantSmtp,
      subject,
      text,
      html,
    });
    if (ok) return true;
    return this.sendPlatformEmail({ to, subject, text, html });
  }
}
