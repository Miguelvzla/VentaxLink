import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicController } from './public.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicController],
})
export class PublicModule {}
