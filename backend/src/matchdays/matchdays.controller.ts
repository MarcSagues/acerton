import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MatchdaysService } from './matchdays.service';
import { GroupsService } from '../groups/groups.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { sortCurrentMatchdayEntries } from './matchday.util';

@Controller()
export class MatchdaysController {
  constructor(
    private readonly matchdaysService: MatchdaysService,
    private readonly groupsService: GroupsService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  @Get('groups/:groupId/matchdays/current')
  async getCurrentForGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.groupsService.assertIsMember(groupId, user.id);
    const activeCompetitions = await this.competitionsService.findActiveByGroup(groupId);

    const matchdays = await Promise.all(
      activeCompetitions.map(async (gc) => ({
        competition: gc.competition,
        matchday: await this.matchdaysService.getCurrentMatchdayForCompetition(gc.competitionId),
      })),
    );

    const pending = matchdays.filter(
      (entry): entry is typeof entry & { matchday: NonNullable<(typeof entry)['matchday']> } =>
        entry.matchday !== null,
    );
    return sortCurrentMatchdayEntries(pending);
  }

  @Get('groups/:groupId/competitions/:competitionId/matchdays')
  async listForCompetition(
    @Param('groupId') groupId: string,
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.groupsService.assertIsMember(groupId, user.id);
    return this.matchdaysService.listForCompetitionWithUserPoints(competitionId, user.id, groupId);
  }

  @Get('matchdays/:id')
  getOne(@Param('id') id: string) {
    return this.matchdaysService.getMatchdayWithMatches(id);
  }

  @Get('matchdays/:id/adjacent')
  getAdjacent(@Param('id') id: string, @Query('direction') direction: string) {
    if (direction !== 'previous' && direction !== 'next') {
      throw new BadRequestException('direction debe ser "previous" o "next"');
    }
    return this.matchdaysService.getAdjacentMatchday(id, direction);
  }
}
