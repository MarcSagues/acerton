import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { QuizHubFacade } from './quiz-hub.facade';

/** Centro del Quiz de jornada: liga, jornada en juego y clasificacion global. */
@Component({
  selector: 'app-quiz-hub',
  standalone: true,
  imports: [DatePipe, SpinnerComponent, EmptyStateComponent, AvatarComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [QuizHubFacade],
  templateUrl: './quiz-hub.component.html',
  styleUrl: './quiz-hub.component.scss',
})
export class QuizHubComponent implements OnInit {
  readonly page = inject(QuizHubFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
