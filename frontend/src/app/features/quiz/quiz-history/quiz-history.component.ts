import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { TeamFlagComponent } from '../../../shared/ui/team-flag/team-flag.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { QuizHistoryFacade } from './quiz-history.facade';

/** Historial de quizzes de un jugador: cada quiz cerrado con sus respuestas y si acerto. */
@Component({
  selector: 'app-quiz-history',
  standalone: true,
  imports: [SpinnerComponent, EmptyStateComponent, AvatarComponent, TeamFlagComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [QuizHistoryFacade],
  templateUrl: './quiz-history.component.html',
  styleUrl: './quiz-history.component.scss',
})
export class QuizHistoryComponent implements OnInit {
  readonly page = inject(QuizHistoryFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
