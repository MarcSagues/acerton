import { Module } from '@nestjs/common';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';
import { GroupsModule } from '../groups/groups.module';
import { SeasonsModule } from '../seasons/seasons.module';

@Module({
  imports: [GroupsModule, SeasonsModule],
  controllers: [RankingsController],
  providers: [RankingsService],
  exports: [RankingsService],
})
export class RankingsModule {}
