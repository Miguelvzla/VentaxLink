import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { OrderNotificationsService } from '../notifications/order-notifications.service';
import { CommercialContactDto } from './dto/commercial-contact.dto';

@Controller('public')
export class PublicController {
  private readonly logger = new Logger(PublicController.name);

  constructor(
    private readonly orderNotifications: OrderNotificationsService,
  ) {}

  /**
   * Responde al toque para evitar 502 por timeout del proxy (SMTP puede tardar).
   * Si la config está mal, 503 antes de encolar.
   */
  @Post('contact')
  contact(@Body() dto: CommercialContactDto) {
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
    void this.orderNotifications
      .sendCommercialContactSync({
        name: dto.name,
        commerce: dto.commerce ?? '',
        message: dto.message,
        replyEmail: dto.reply_email,
      })
      .then((ok) => {
        if (!ok) {
          this.logger.warn(
            'Contacto comercial: sendCommercialContactSync devolvió false (revisá logs SMTP)',
          );
        }
      })
      .catch((err: unknown) => {
        this.logger.error(
          `Contacto comercial falló: ${err instanceof Error ? err.message : err}`,
        );
      });
    return { ok: true };
  }
}
