import { Module } from '@nestjs/common';
import { BillingReminderService } from './billing-reminder.service';
import { OrderNotificationsService } from './order-notifications.service';
import { ResendMailService } from './resend-mail.service';

@Module({
  providers: [
    OrderNotificationsService,
    BillingReminderService,
    ResendMailService,
  ],
  exports: [OrderNotificationsService, ResendMailService],
})
export class NotificationsModule {}
