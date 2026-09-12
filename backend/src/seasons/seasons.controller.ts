import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SeasonsService } from './seasons.service';
import { GroupsService } from '../groups/groups.service';

@Controller('groups/:groupId/seasons')
export class SeasonsController {
  constructor(
    private readonly seasonsService: SeasonsService,
    private readonly groupsService: GroupsService,
  ) {}

  @Get()
  async listSeasons(@Param('groupId') groupId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.seasonsService.listSeasons(groupId);
  }
}
