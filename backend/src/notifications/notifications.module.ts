import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DashboardNotificationsController } from './dashboard-notifications.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesController } from './notification-preferences.controller';

@Module({
  controllers: [
    NotificationPreferencesController,
    NotificationsController,
    DashboardNotificationsController,
  ],
  providers: [NotificationsService, NotificationPreferencesService],
  exports: [NotificationsService, NotificationPreferencesService],
})
export class NotificationsModule {}
