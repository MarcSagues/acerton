import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { WildcardsModule } from '../wildcards/wildcards.module';
import { GroupsModule } from '../groups/groups.module';
import { MatchdaysModule } from '../matchdays/matchdays.module';

@Module({
  imports: [WildcardsModule, GroupsModule, MatchdaysModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
