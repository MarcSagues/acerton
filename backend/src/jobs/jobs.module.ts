import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { MatchdaysModule } from '../matchdays/matchdays.module';
import { PredictionsModule } from '../predictions/predictions.module';
import { RankingsModule } from '../rankings/rankings.module';
import { StreaksModule } from '../streaks/streaks.module';
import { BadgesModule } from '../badges/badges.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MatchdaysModule,
    PredictionsModule,
    RankingsModule,
    StreaksModule,
    BadgesModule,
    NotificationsModule,
  ],
  providers: [JobsService],
})
export class JobsModule {}
