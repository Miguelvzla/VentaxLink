import { Injectable } from '@nestjs/common';
import { accessSync, constants } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { resolveUploadsRoot } from '../uploads/uploads-path';

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
    const uploads_dir = resolveUploadsRoot();
    let uploads_writable = false;
    try {
      accessSync(uploads_dir, constants.W_OK);
      uploads_writable = true;
    } catch {
      uploads_writable = false;
    }
    return {
      status: 'ok',
      database,
      time: new Date().toISOString(),
      smtp_ready,
      contact_inbox,
      uploads_writable,
      uploads_dir,
      smtp: {
        host: smtpHost,
        mail_from: smtpFrom,
        user: smtpUser,
        pass: smtpPass,
      },
    };
  }
}
