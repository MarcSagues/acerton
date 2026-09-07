import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { WildcardsModule } from '../wildcards/wildcards.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [WildcardsModule, GroupsModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
