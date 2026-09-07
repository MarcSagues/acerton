import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { StreaksService } from './streaks.service';
import { GroupsService } from '../groups/groups.service';

@Controller('groups/:groupId/streaks')
export class StreaksController {
  constructor(
    private readonly streaksService: StreaksService,
    private readonly groupsService: GroupsService,
  ) {}

  @Get('me')
  async getMine(@Param('groupId') groupId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.streaksService.getForUserInGroup(user.id, groupId);
  }

  @Get()
  async getAll(@Param('groupId') groupId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.streaksService.getAllForGroup(groupId);
  }
}
