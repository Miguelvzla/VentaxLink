import { Module } from '@nestjs/common';
import { BillingReminderService } from './billing-reminder.service';
import { OrderNotificationsService } from './order-notifications.service';

@Module({
  providers: [OrderNotificationsService, BillingReminderService],
  exports: [OrderNotificationsService],
})
export class NotificationsModule {}
