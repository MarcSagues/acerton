import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Controller('users/me/notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    const [preferences, groups] = await Promise.all([
      this.preferencesService.getForUser(user.id),
      this.preferencesService.getMutedGroups(user.id),
    ]);
    return { ...preferences, groups };
  }

  @Patch()
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const [preferences, groups] = await Promise.all([
      this.preferencesService.updateForUser(user.id, dto),
      this.preferencesService.getMutedGroups(user.id),
    ]);
    return { ...preferences, groups };
  }
}
