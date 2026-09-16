import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';
import { RedeemReferralDto } from './dto/redeem-referral.dto';

@Controller('users/me/referral')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getMyReferral(user.id);
  }

  @Post('redeem')
  redeem(@CurrentUser() user: AuthenticatedUser, @Body() dto: RedeemReferralDto) {
    return this.referralsService.redeem(user.id, dto.code);
  }
}
