import { Module } from '@nestjs/common';
import { WildcardsController } from './wildcards.controller';
import { WildcardsService } from './wildcards.service';
import { GroupsModule } from '../groups/groups.module';
import { RankingsModule } from '../rankings/rankings.module';

@Module({
  imports: [GroupsModule, RankingsModule],
  controllers: [WildcardsController],
  providers: [WildcardsService],
  exports: [WildcardsService],
})
export class WildcardsModule {}
