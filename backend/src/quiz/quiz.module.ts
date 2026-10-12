import { Module } from '@nestjs/common';
import { MatchdaysModule } from '../matchdays/matchdays.module';
import { FootballDataModule } from '../football-data/football-data.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizJobs } from './quiz.jobs';

@Module({
  imports: [MatchdaysModule, FootballDataModule],
  controllers: [QuizController],
  providers: [QuizService, QuizJobs],
  exports: [QuizService],
})
export class QuizModule {}
