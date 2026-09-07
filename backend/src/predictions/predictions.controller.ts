import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PredictionsService } from './predictions.service';
import { SubmitPredictionDto } from './dto/submit-prediction.dto';

@Controller('groups/:groupId/predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post()
  submit(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitPredictionDto,
  ) {
    return this.predictionsService.submit(user.id, groupId, dto);
  }

  @Get('mine/:matchdayId')
  getMine(
    @Param('groupId') groupId: string,
    @Param('matchdayId') matchdayId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.predictionsService.getMine(user.id, groupId, matchdayId);
  }

  @Get('matchday/:matchdayId')
  getGroupPredictions(
    @Param('groupId') groupId: string,
    @Param('matchdayId') matchdayId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.predictionsService.getGroupPredictionsForMatchday(user.id, groupId, matchdayId);
  }
}
