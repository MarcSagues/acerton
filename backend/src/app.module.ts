import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { FootballDataModule } from './football-data/football-data.module';
import { MatchdaysModule } from './matchdays/matchdays.module';
import { PredictionsModule } from './predictions/predictions.module';
import { WildcardsModule } from './wildcards/wildcards.module';
import { RankingsModule } from './rankings/rankings.module';
import { SeasonsModule } from './seasons/seasons.module';
import { StreaksModule } from './streaks/streaks.module';
import { BadgesModule } from './badges/badges.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    ScheduleModule.forRoot(),
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
    SeasonsModule,
    StreaksModule,
    BadgesModule,
    NotificationsModule,
    JobsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
