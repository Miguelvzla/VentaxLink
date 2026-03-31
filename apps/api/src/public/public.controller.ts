import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { OrderNotificationsService } from '../notifications/order-notifications.service';
import { CommercialContactDto } from './dto/commercial-contact.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly orderNotifications: OrderNotificationsService,
  ) {}

  @Post('contact')
  async contact(@Body() dto: CommercialContactDto) {
    const ok = await this.orderNotifications.sendCommercialContactSync({
      name: dto.name,
      commerce: dto.commerce ?? '',
      message: dto.message,
      replyEmail: dto.reply_email,
    });
    if (!ok) {
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
    return { ok: true };
  }
}
