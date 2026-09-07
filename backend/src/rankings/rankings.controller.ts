import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RankingsService } from './rankings.service';
import { GroupsService } from '../groups/groups.service';
import { GetRankingQueryDto } from './dto/get-ranking.dto';

@Controller('groups/:groupId/rankings')
export class RankingsController {
  constructor(
    private readonly rankingsService: RankingsService,
    private readonly groupsService: GroupsService,
  ) {}

  @Get()
  async getRanking(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetRankingQueryDto,
  ) {
    await this.groupsService.assertIsMember(groupId, user.id);
    const competitionId = query.scope === 'general' ? null : query.scope;

    if (query.matchdayId) {
      return this.rankingsService.getRankingForMatchday(
        groupId,
        query.period,
        competitionId,
        query.matchdayId,
      );
    }

    return this.rankingsService.getLatestRanking(groupId, query.period, competitionId);
  }
}
