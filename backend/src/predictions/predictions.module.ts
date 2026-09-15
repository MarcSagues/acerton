import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { WildcardsModule } from '../wildcards/wildcards.module';
import { GroupsModule } from '../groups/groups.module';
import { MatchdaysModule } from '../matchdays/matchdays.module';
import { XpModule } from '../xp/xp.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WildcardsModule, GroupsModule, MatchdaysModule, XpModule, NotificationsModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
