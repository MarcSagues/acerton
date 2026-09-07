import { Module } from '@nestjs/common';
import { FootballDataOrgProvider } from './football-data-org.provider';
import { FOOTBALL_PROVIDER } from './football-provider.interface';

@Module({
  providers: [{ provide: FOOTBALL_PROVIDER, useClass: FootballDataOrgProvider }],
  exports: [FOOTBALL_PROVIDER],
})
export class FootballDataModule {}
