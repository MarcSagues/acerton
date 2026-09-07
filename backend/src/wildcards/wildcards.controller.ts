import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { WildcardsService } from './wildcards.service';
import { GroupsService } from '../groups/groups.service';

@Controller('groups/:groupId/wildcards')
export class WildcardsController {
  constructor(
    private readonly wildcardsService: WildcardsService,
    private readonly groupsService: GroupsService,
  ) {}

  /** matchdayId opcional: sin el solo se informa del gap/allowance, sin usos ya gastados. */
  @Get('comeback')
  async getComebackStatus(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('matchdayId') matchdayId?: string,
  ) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.wildcardsService.getComebackStatus(user.id, groupId, matchdayId);
  }
}
