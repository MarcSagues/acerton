import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BadgesService } from './badges.service';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get('catalog')
  findCatalog() {
    return this.badgesService.findCatalog();
  }

  @Get('stats')
  getStats() {
    return this.badgesService.getEarnStats();
  }

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.badgesService.getForUser(user.id);
  }
}
