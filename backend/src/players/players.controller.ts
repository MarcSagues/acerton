import { Controller, Get, Param } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  /** Perfil general de un jugador (el propio o el de cualquier otro): sus datos publicos y un resumen de grupos, Quiz e insignias. */
  @Get(':userId')
  profile(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.players.getProfile(user.id, userId);
  }
}
