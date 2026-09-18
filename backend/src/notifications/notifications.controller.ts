import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Boton "Probar notificaciones" en Ajustes (ver ProfilePageFacade). */
  @Post('test-broadcast')
  async testBroadcast() {
    return this.notificationsService.sendTestBroadcast();
  }

  /** Pantalla "Avisos" (ver issue #21) — los avisos reales del usuario, mas recientes primero. */
  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getFeedForUser(user.id);
  }

  /** Boton "Leer todo": no hay interaccion aviso a aviso, solo en bloque. */
  @Post('me/read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllRead(user.id);
  }
}
