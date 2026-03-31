import { Body, Controller, Post } from '@nestjs/common';
import { OrderNotificationsService } from '../notifications/order-notifications.service';
import { CommercialContactDto } from './dto/commercial-contact.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly orderNotifications: OrderNotificationsService,
  ) {}

  @Post('contact')
  contact(@Body() dto: CommercialContactDto) {
    this.orderNotifications.scheduleCommercialContact({
      name: dto.name,
      commerce: dto.commerce ?? '',
      message: dto.message,
      replyEmail: dto.reply_email,
    });
    return { ok: true };
  }
}
