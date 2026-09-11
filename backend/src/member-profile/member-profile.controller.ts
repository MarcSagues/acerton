import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MemberProfileService } from './member-profile.service';
import { GroupsService } from '../groups/groups.service';

@Controller('groups/:groupId/members/:userId/profile')
export class MemberProfileController {
  constructor(
    private readonly memberProfileService: MemberProfileService,
    private readonly groupsService: GroupsService,
  ) {}

  @Get()
  async getProfile(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.memberProfileService.getMemberProfile(groupId, userId);
  }
}
