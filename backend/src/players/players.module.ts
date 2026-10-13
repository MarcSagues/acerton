import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [QuizModule],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
