import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { EligibilityService } from './eligibility.service';
import { GroupsService } from '../groups/groups.service';

@Controller('groups/:groupId/eligibility')
export class EligibilityController {
  constructor(
    private readonly eligibilityService: EligibilityService,
    private readonly groupsService: GroupsService,
  ) {}

  @Get()
  async getGroupEligibility(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.eligibilityService.computeGroupEligibility(groupId);
  }
}
