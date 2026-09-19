import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration, { AppConfig } from './config/configuration';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { PublicGroupPreviewModule } from './groups/public-group-preview/public-group-preview.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { FootballDataModule } from './football-data/football-data.module';
import { MatchdaysModule } from './matchdays/matchdays.module';
import { PredictionsModule } from './predictions/predictions.module';
import { WildcardsModule } from './wildcards/wildcards.module';
import { RankingsModule } from './rankings/rankings.module';
import { SeasonsModule } from './seasons/seasons.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { MemberProfileModule } from './member-profile/member-profile.module';
import { StreaksModule } from './streaks/streaks.module';
import { BadgesModule } from './badges/badges.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    ScheduleModule.forRoot(),
    // Limite global por IP; los endpoints sensibles de auth lo ajustan mas
    // abajo con @Throttle() (ver AuthController). Desactivado fuera de
    // produccion para no romper el login repetido de los tests e2e y el
    // uso normal en desarrollo (mismo criterio que la cookie `secure` de
    // AuthController.setRefreshCookie).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        throttlers: [{ ttl: 60_000, limit: 60 }],
        skipIf: () => configService.get('nodeEnv', { infer: true }) !== 'production',
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    CompetitionsModule,
    FootballDataModule,
    MatchdaysModule,
    PredictionsModule,
    WildcardsModule,
    RankingsModule,
    PublicGroupPreviewModule,
    SeasonsModule,
    EligibilityModule,
    MemberProfileModule,
    StreaksModule,
    BadgesModule,
    NotificationsModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
