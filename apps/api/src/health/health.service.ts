import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    let database = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
    const smtpHost = !!process.env.SMTP_HOST?.trim();
    const smtpFrom = !!process.env.MAIL_FROM?.trim();
    const smtpUser = !!process.env.SMTP_USER?.trim();
    const smtpPass = !!process.env.SMTP_PASS?.trim();
    /** Igual que OrderNotificationsService.isGlobalSmtpConfigured — solo host + from */
    const smtp_ready = smtpHost && smtpFrom;
    const contact_inbox =
      !!process.env.CONTACT_FORM_TO_EMAIL?.trim() ||
      !!process.env.SUPPORT_INBOX_EMAIL?.trim();
    return {
      status: 'ok',
      database,
      time: new Date().toISOString(),
      smtp_ready,
      contact_inbox,
      smtp: {
        host: smtpHost,
        mail_from: smtpFrom,
        user: smtpUser,
        pass: smtpPass,
      },
    };
  }
}
