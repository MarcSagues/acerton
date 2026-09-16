import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { StreaksService } from '../streaks/streaks.service';
import { WildcardsService } from '../wildcards/wildcards.service';
import { xpProgressForLevel } from '../xp/xp.util';

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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [badges, groupsSummary, globalStreak, me, badgesTotal, scoredPredictions, hitPredictions, xpLast7DaysAgg] =
      await Promise.all([
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
        this.streaksService.getGlobalForUser(user.id),
        this.prisma.user.findUnique({ where: { id: user.id }, select: { experience: true } }),
        this.prisma.badge.count(),
        this.prisma.prediction.count({ where: { userId: user.id, pointsEarned: { not: null } } }),
        this.prisma.prediction.count({ where: { userId: user.id, pointsEarned: { gt: 0 } } }),
        this.prisma.xpEvent.aggregate({
          where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
          _sum: { amount: true },
        }),
      ]);

    return {
      badges,
      groups: groupsSummary,
      globalStreak: { currentStreak: globalStreak.currentStreak, longestStreak: globalStreak.longestStreak },
      xp: xpProgressForLevel(me?.experience ?? 0),
      xpLast7Days: xpLast7DaysAgg._sum.amount ?? 0,
      accuracy: { hits: hitPredictions, scored: scoredPredictions },
      badgesUnlocked: { earned: new Set(badges.map((b) => b.badge.code)).size, total: badgesTotal },
    };
  }
}
