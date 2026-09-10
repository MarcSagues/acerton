import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { RegisterNotificationTokenDto } from './dto/register-notification-token.dto';
import { UpdateNameDto } from './dto/update-name.dto';

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
