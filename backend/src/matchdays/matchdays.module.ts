import { Module, forwardRef } from '@nestjs/common';
import { MatchdaysController } from './matchdays.controller';
import { MatchdaysService } from './matchdays.service';
import { FootballDataModule } from '../football-data/football-data.module';
import { GroupsModule } from '../groups/groups.module';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [FootballDataModule, forwardRef(() => GroupsModule), CompetitionsModule],
  controllers: [MatchdaysController],
  providers: [MatchdaysService],
  exports: [MatchdaysService],
})
export class MatchdaysModule {}
