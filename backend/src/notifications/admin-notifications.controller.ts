import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { AdminBroadcastDto } from './dto/admin-broadcast.dto';
import { NotificationsService } from './notifications.service';

/** Endpoints para el dashboard de administracion (ver AdminApiKeyGuard): sin JWT, con clave compartida. */
@Public()
@UseGuards(AdminApiKeyGuard)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Comunicado manual: push a todos o a una lista de usuarios, y aviso en su pantalla "Avisos". */
  @Post('broadcast')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  broadcast(@Body() dto: AdminBroadcastDto) {
    return this.notificationsService.sendAnnouncement(dto);
  }
}
