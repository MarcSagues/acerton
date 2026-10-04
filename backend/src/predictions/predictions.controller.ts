import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PredictionsService } from './predictions.service';
import { SubmitPredictionDto } from './dto/submit-prediction.dto';
import { CopyPredictionsDto } from './dto/copy-predictions.dto';

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

  /** Otros grupos del usuario de los que se pueden copiar los pronosticos de una jornada al grupo de la URL. */
  @Get('copy-sources/:matchdayId')
  getCopySources(
    @Param('groupId') groupId: string,
    @Param('matchdayId') matchdayId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.predictionsService.getCopySources(user.id, groupId, matchdayId);
  }

  /** Copia al grupo de la URL los pronosticos de una jornada ya hechos en `sourceGroupId`. */
  @Post('copy-from/:sourceGroupId')
  copyFrom(
    @Param('groupId') groupId: string,
    @Param('sourceGroupId') sourceGroupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CopyPredictionsDto,
  ) {
    return this.predictionsService.copyFromGroup(user.id, groupId, sourceGroupId, dto.matchdayId);
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
