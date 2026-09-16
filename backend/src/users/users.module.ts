import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BadgesModule } from '../badges/badges.module';
import { StreaksModule } from '../streaks/streaks.module';
import { WildcardsModule } from '../wildcards/wildcards.module';
import { XpModule } from '../xp/xp.module';
import { ProfileController } from './profile.controller';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [BadgesModule, StreaksModule, WildcardsModule, XpModule],
  controllers: [UsersController, ProfileController, ReferralsController],
  providers: [UsersService, ReferralsService],
  exports: [UsersService, ReferralsService],
})
export class UsersModule {}
