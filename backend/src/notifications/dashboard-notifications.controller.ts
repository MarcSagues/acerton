import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { SendAnnouncementDto } from './dto/send-announcement.dto';
import { NotificationsService } from './notifications.service';

/**
 * Endpoints que solo puede llamar piqo-dashboard (panel de administracion,
 * proyecto aparte) desde su servidor, con la clave compartida
 * DASHBOARD_API_KEY en la cabecera X-Dashboard-Key. No hay JWT de usuario
 * aqui: @Public() salta el guard global y DashboardApiKeyGuard es el unico
 * control de acceso.
 */
@Public()
@UseGuards(DashboardApiKeyGuard)
@Controller('dashboard')
export class DashboardNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Envia una notificacion push a todo el mundo (todos los dispositivos
   * registrados). Irreversible una vez enviada: el dashboard debe confirmar
   * con el admin antes, y puede llamar primero con dryRun:true para ver a
   * cuantos usuarios llegaria. Limitado a 5 peticiones por minuto.
   */
  @Post('send-notification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendNotification(@Body() dto: SendAnnouncementDto) {
    return this.notificationsService.broadcastAnnouncement(dto);
  }
}
