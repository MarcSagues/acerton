import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { QuizService } from './quiz.service';
import { QuizRankingQueryDto, SaveQuizAnswersDto } from './dto/quiz.dto';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.quiz.overview(user.id);
  }

  @Get('rankings')
  rankings(@CurrentUser() user: AuthenticatedUser, @Query() query: QuizRankingQueryDto) {
    return this.quiz.rankings(user.id, query);
  }

  /** Historial de quizzes de un jugador (el propio o el de quien comparte grupo contigo). */
  @Get('history/:userId')
  history(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quiz.history(user.id, userId);
  }

  @Get(':quizId')
  detail(@Param('quizId') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quiz.detail(id, user.id);
  }

  @Post(':quizId/participation')
  start(@Param('quizId') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quiz.start(id, user.id);
  }

  @Put(':quizId/answers')
  save(
    @Param('quizId') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SaveQuizAnswersDto,
  ) {
    return this.quiz.saveAnswers(id, user.id, body.answers);
  }

  @Post(':quizId/complete')
  complete(@Param('quizId') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quiz.complete(id, user.id);
  }
}
