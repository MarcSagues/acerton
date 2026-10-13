import { Module } from '@nestjs/common';
import { MatchdaysModule } from '../matchdays/matchdays.module';
import { FootballDataModule } from '../football-data/football-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizJobs } from './quiz.jobs';
import { QuizRemindersService } from './quiz-reminders.service';

@Module({
  imports: [MatchdaysModule, FootballDataModule, NotificationsModule],
  controllers: [QuizController],
  providers: [QuizService, QuizJobs, QuizRemindersService],
  exports: [QuizService],
})
export class QuizModule {}
