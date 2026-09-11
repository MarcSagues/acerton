import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { RegisterNotificationTokenDto } from './dto/register-notification-token.dto';
import { UpdateNameDto } from './dto/update-name.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { AVATAR_BACKGROUNDS, AVATAR_MASCOT_IDS, mascotAssetPath } from './avatar-catalog';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findPublicById(user.id);
  }

  @Patch('me/name')
  updateName(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNameDto) {
    return this.usersService.updateName(user.id, dto.name);
  }

  @Get('me/avatar-catalog')
  getAvatarCatalog() {
    return {
      mascots: AVATAR_MASCOT_IDS.map((id) => ({ id, url: mascotAssetPath(id) })),
      backgrounds: AVATAR_BACKGROUNDS,
    };
  }

  @Patch('me/avatar')
  updateAvatar(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAvatarDto) {
    return this.usersService.updateAvatar(user.id, dto.mascotId, dto.background);
  }

  @Patch('me/tutorial-completed')
  completeTutorial(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.completeTutorial(user.id);
  }

  @Post('me/notification-tokens')
  registerToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterNotificationTokenDto) {
    return this.usersService.registerNotificationToken(user.id, dto.token);
  }

  @Delete('me/notification-tokens')
  removeToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterNotificationTokenDto) {
    return this.usersService.removeNotificationToken(user.id, dto.token);
  }
}
