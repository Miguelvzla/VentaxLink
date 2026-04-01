import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { OrderNotificationsService } from '../notifications/order-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialContactDto } from './dto/commercial-contact.dto';

@Controller('public')
export class PublicController {
  private readonly logger = new Logger(PublicController.name);

  constructor(
    private readonly orderNotifications: OrderNotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('legal')
  async legal() {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: 'marketplace_terms' },
      select: { value: true, updated_at: true },
    });
    const fallback =
      'VentaXLink provee la plataforma tecnológica para publicar tiendas online. La compra se realiza directamente al comercio vendedor, que es responsable por precios, stock, entrega, facturación y postventa.';
    return {
      data: {
        marketplace_terms: row?.value?.trim() || fallback,
        updated_at: row?.updated_at?.toISOString() ?? null,
      },
    };
  }

  /**
   * Espera al envío SMTP para no dar “ok” si el correo no salió (antes era fire-and-forget).
   * Si el proxy corta por tiempo, subí CONTACT_REQUEST_TIMEOUT_MS / REQUEST_TIMEOUT_MS en la API.
   */
  @Post('contact')
  async contact(@Body() dto: CommercialContactDto) {
    if (!this.orderNotifications.contactFormReady()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'No se pudo enviar el mensaje. En el servidor de la API tenés que configurar CONTACT_FORM_TO_EMAIL (o SUPPORT_INBOX_EMAIL) y SMTP global (SMTP_HOST, MAIL_FROM, etc.).',
          code: 'CONTACT_MAIL_NOT_CONFIGURED',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    try {
      const sent = await this.orderNotifications.sendCommercialContactSync({
        name: dto.name,
        commerce: dto.commerce ?? '',
        message: dto.message,
        replyEmail: dto.reply_email,
      });
      if (!sent) {
        this.logger.warn(
          'Contacto comercial: sendCommercialContactSync devolvió false (revisá SMTP)',
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'No se pudo entregar el mensaje por correo. Revisá SMTP (SMTP_HOST, MAIL_FROM, SMTP_USER/PASS) en el servidor de la API.',
            code: 'CONTACT_MAIL_SEND_FAILED',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return { ok: true };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Contacto comercial SMTP: ${msg}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `No se pudo enviar el correo: ${msg}`,
          code: 'CONTACT_SMTP_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
