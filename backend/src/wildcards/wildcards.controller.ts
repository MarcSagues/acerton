import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { WildcardsService } from './wildcards.service';
import { GroupsService } from '../groups/groups.service';
import { ClaimAdRewardDto } from './dto/claim-ad-reward.dto';

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

  /** El cliente llama aqui justo despues de que AdMob confirme la recompensa del video (ver AdsService en el frontend). */
  @Post('comeback/ad-reward')
  async claimAdReward(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClaimAdRewardDto,
  ) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.wildcardsService.claimAdReward(user.id, groupId, dto.matchdayId);
  }
}
