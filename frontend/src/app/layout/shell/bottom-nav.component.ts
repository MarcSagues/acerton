import { CUSTOM_ELEMENTS_SCHEMA, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { BottomNavService } from '../../core/services/bottom-nav.service';
import { ActiveGroupService } from '../../core/services/active-group.service';
import { QuizService } from '../../core/services/quiz.service';
import { isPendingForUser } from '../../features/quiz/domain/quiz-rules';

/** El resumen del Quiz para el punto de la barra se vuelve a pedir como mucho cada minuto. */
const QUIZ_REFRESH_MS = 60_000;
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  readonly bottomNav = inject(BottomNavService);
  readonly activeGroupService = inject(ActiveGroupService);

  /** Ver comentario en BottomNavService.liveJornadaPending: en vivo si Jornada esta montada, si no el ultimo dato conocido del grupo activo. */
  readonly hasPendingJornadaPicks = computed(
    () => this.bottomNav.liveJornadaPending() ?? this.activeGroupService.activeGroupHasPendingPicks(),
  );

  private readonly quizService = inject(QuizService);
  /** Reloj de la barra, al minuto: basta para que el punto se apague cuando cierra una jornada. */
  private readonly now = signal(Date.now());

  /** Punto rojo de "Quiz": alguna jornada abierta que el usuario aun no ha terminado. */
  readonly hasPendingQuiz = computed(
    () => {
      const overview = this.quizService.lastOverview();
      return (overview?.events ?? overview?.quizzes ?? []).some((q) => isPendingForUser(q, this.now()));
    },
  );

  constructor() {
    this.quizService.refreshOverviewIfStale(QUIZ_REFRESH_MS);
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.quizService.refreshOverviewIfStale(QUIZ_REFRESH_MS));
    const tick = setInterval(() => this.now.set(Date.now()), QUIZ_REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }
}
