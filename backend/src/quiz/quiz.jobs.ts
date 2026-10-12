import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { QuizService } from './quiz.service';
import { AppConfig } from '../config/configuration';
import { FOOTBALL_PROVIDER, FootballProvider } from '../football-data/football-provider.interface';
import { computeMatchResult } from '../matchdays/matchday.util';

@Injectable()
export class QuizJobs implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuizJobs.name);
  private readonly nextCalendarAttempt = new Map<string, number>();
  private calendarsRunning = false;
  private refreshRunning = false;

  constructor(
    private readonly quiz: QuizService,
    private readonly prisma: PrismaService,
    private readonly matchdays: MatchdaysService,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(FOOTBALL_PROVIDER) private readonly football: FootballProvider,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.refreshEvents();
    // Importing several competitions is deliberately paced; do not hold startup waiting for API slots.
    void this.syncCalendars().catch((error: unknown) =>
      this.logger.error('Error iniciando los calendarios del quiz', error),
    );
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncCalendars(): Promise<void> {
    if (this.calendarsRunning || !this.config.get('footballData.apiKey', { infer: true })) return;
    this.calendarsRunning = true;
    try {
      for (const competition of await this.quiz.competitions()) {
        if ((this.nextCalendarAttempt.get(competition.id) ?? 0) > Date.now()) continue;
        try {
          const available = await this.matchdays.ensureUpcomingMatchday(competition.id);
          if (available) this.nextCalendarAttempt.delete(competition.id);
          else this.nextCalendarAttempt.set(competition.id, Date.now() + 3 * 60 * 60 * 1000);
        } catch (error) {
          this.nextCalendarAttempt.set(competition.id, Date.now() + 3 * 60 * 60 * 1000);
          this.logger.error(`Error sincronizando quiz ${competition.code}`, error);
        }
      }
      await this.refreshEvents();
    } finally {
      this.calendarsRunning = false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshEvents(): Promise<void> {
    if (this.refreshRunning) return;
    this.refreshRunning = true;
    try {
      await this.quiz.refreshAll();
    } catch (error) {
      this.logger.error('Error actualizando eventos del quiz', error);
    } finally {
      this.refreshRunning = false;
    }
  }

  /** Existing result jobs refresh pending matches globally. Re-fetch recent finals daily for corrections. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'Europe/Madrid' })
  async refreshRecentFinals(): Promise<void> {
    if (!this.config.get('footballData.apiKey', { infer: true })) return;
    const matches = await this.prisma.match.findMany({
      where: {
        status: 'FINISHED',
        kickoff: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        matchday: { quizEvent: { isNot: null } },
      },
      select: { externalId: true },
    });
    try {
      const fixtures = await this.football.getFixturesByIds(matches.map((m) => m.externalId));
      for (const fixture of fixtures) {
        await this.prisma.match.update({
          where: { externalId: fixture.fixtureId },
          data: {
            status: fixture.status,
            kickoff: fixture.kickoff,
            homeScore: fixture.homeGoals,
            awayScore: fixture.awayGoals,
            result: computeMatchResult(fixture.homeGoals, fixture.awayGoals),
          },
        });
      }
      await this.refreshEvents();
    } catch (error) {
      this.logger.error('Error comprobando correcciones de resultados del quiz', error);
    }
  }
}
