import { Module, forwardRef } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { CompetitionsModule } from '../competitions/competitions.module';
import { MatchdaysModule } from '../matchdays/matchdays.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [CompetitionsModule, forwardRef(() => MatchdaysModule), BadgesModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
