import { Module } from '@nestjs/common';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';
import { FootballDataModule } from '../football-data/football-data.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [FootballDataModule, GroupsModule],
  controllers: [SeasonsController],
  providers: [SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
