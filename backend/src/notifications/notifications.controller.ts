import { Controller, Get, Param, Post } from '@nestjs/common';
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

  /** Boton "Leer todo". */
  @Post('me/read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllRead(user.id);
  }

  /** Marca un aviso concreto como leido (p.ej. al pulsar el de subida de nivel). */
  @Post('me/:id/read')
  async markOneRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.notificationsService.markOneRead(user.id, id);
  }
}
