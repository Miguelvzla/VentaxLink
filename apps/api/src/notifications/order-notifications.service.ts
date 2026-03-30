import { Injectable, Logger } from '@nestjs/common';
import { DeliveryType } from '@prisma/client';
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
}
