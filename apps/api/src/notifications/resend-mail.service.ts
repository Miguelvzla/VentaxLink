import { Injectable, Logger } from '@nestjs/common';

/**
 * Envío transaccional vía API HTTPS (Resend). Funciona en Railway Hobby sin SMTP saliente.
 */
@Injectable()
export class ResendMailService {
  private readonly logger = new Logger(ResendMailService.name);

  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY?.trim();
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    const key = process.env.RESEND_API_KEY?.trim();
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';
    if (!key) {
      this.logger.warn(
        'RESEND_API_KEY no configurado: no se puede enviar correo (p. ej. recuperación de contraseña)',
      );
      return false;
    }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.to.trim()],
          subject: params.subject,
          html: params.html,
          ...(params.text ? { text: params.text } : {}),
        }),
      });
      const body = await r.text();
      if (!r.ok) {
        this.logger.error(
          `Resend ${r.status}: ${body.slice(0, 600)}${body.length > 600 ? '…' : ''}`,
        );
        return false;
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Resend fetch error: ${msg}`);
      return false;
    }
  }
}
