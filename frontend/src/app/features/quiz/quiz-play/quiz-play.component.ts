import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { isKickoffTimeTbc } from '../../matchday/domain/prediction-rules';
import { QuizMatch } from '../../../core/models/quiz.model';
import { teamName } from '../domain/quiz-rules';
import { QuizPlayFacade } from './quiz-play.facade';

/** Recorrido de un quiz: una pregunta por paso, resumen y resultados de solo lectura. */
@Component({
  selector: 'app-quiz-play',
  standalone: true,
  imports: [DatePipe, SpinnerComponent, EmptyStateComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [QuizPlayFacade],
  templateUrl: './quiz-play.component.html',
  styleUrl: './quiz-play.component.scss',
})
export class QuizPlayComponent implements OnInit {
  readonly page = inject(QuizPlayFacade);

  ngOnInit(): void {
    this.page.init();
  }

  team(match: QuizMatch, side: 'home' | 'away'): string {
    return teamName(match, side);
  }

  /** Hora sin confirmar: o lo dice el servidor, o es la de relleno del proveedor (00:00 UTC). */
  kickoffTbc(match: QuizMatch): boolean {
    return !match.kickoffConfirmed || isKickoffTimeTbc(match.kickoff);
  }
}
