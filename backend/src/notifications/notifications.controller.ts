import { Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Boton "Probar notificaciones" en Ajustes (ver ProfilePageFacade). */
  @Post('test-broadcast')
  async testBroadcast() {
    return this.notificationsService.sendTestBroadcast();
  }
}
