import { Module } from '@nestjs/common';
import { MemberProfileController } from './member-profile.controller';
import { MemberProfileService } from './member-profile.service';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [GroupsModule],
  controllers: [MemberProfileController],
  providers: [MemberProfileService],
})
export class MemberProfileModule {}
