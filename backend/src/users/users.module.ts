import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BadgesModule } from '../badges/badges.module';
import { StreaksModule } from '../streaks/streaks.module';
import { WildcardsModule } from '../wildcards/wildcards.module';
import { ProfileController } from './profile.controller';

@Module({
  imports: [BadgesModule, StreaksModule, WildcardsModule],
  controllers: [UsersController, ProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
