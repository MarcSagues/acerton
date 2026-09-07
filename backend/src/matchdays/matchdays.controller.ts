import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MatchdaysService } from './matchdays.service';
import { GroupsService } from '../groups/groups.service';
import { CompetitionsService } from '../competitions/competitions.service';

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

    return matchdays.filter((entry) => entry.matchday !== null);
  }

  @Get('matchdays/:id')
  getOne(@Param('id') id: string) {
    return this.matchdaysService.getMatchdayWithMatches(id);
  }
}
