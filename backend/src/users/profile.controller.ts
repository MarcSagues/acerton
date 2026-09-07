import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { StreaksService } from '../streaks/streaks.service';
import { WildcardsService } from '../wildcards/wildcards.service';

@Controller('users/me/profile')
export class ProfileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
    private readonly streaksService: StreaksService,
    private readonly wildcardsService: WildcardsService,
  ) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId: user.id },
      include: { group: { select: { id: true, name: true } } },
    });

    const [badges, groupsSummary] = await Promise.all([
      this.badgesService.getForUser(user.id),
      Promise.all(
        memberships.map(async (membership) => {
          const [streak, comeback] = await Promise.all([
            this.streaksService.getForUserInGroup(user.id, membership.groupId),
            this.wildcardsService.getComebackStatus(user.id, membership.groupId),
          ]);
          return {
            group: membership.group,
            streak: { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak },
            comeback,
          };
        }),
      ),
    ]);

    return { badges, groups: groupsSummary };
  }
}
