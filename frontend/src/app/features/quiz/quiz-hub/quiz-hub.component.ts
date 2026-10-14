import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { InViewDirective } from '../../../shared/directives/in-view.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { QuizHubFacade } from './quiz-hub.facade';

/** Centro del Quiz de jornada: liga, jornada en juego y clasificacion global. */
@Component({
  selector: 'app-quiz-hub',
  standalone: true,
  imports: [DatePipe, RouterLink, SpinnerComponent, EmptyStateComponent, AvatarComponent, InViewDirective, TranslatePipe],
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

  /**
   * Pulsar mi fila fija: baja con scroll suave hasta mi puesto en la lista. Si todavia no esta cargado (por ejemplo, el puesto 200),
   * primero se carga una ventana de jugadores alrededor del mio, y asi se ve tambien a quien tengo cerca.
   */
  async goToMe(): Promise<void> {
    this.page.jumping.set(true);
    try {
      const loaded = await this.page.ensureMeLoaded();
      const me = this.page.rankingMe();
      if (!loaded || !me) return;
      // Dos fotogramas para que la fila recien cargada ya este pintada antes de desplazarse a ella.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      document.getElementById('quiz-row-' + me.userId)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      this.page.flash(me.userId);
      await this.scrollEnd();
    } finally {
      this.page.jumping.set(false);
    }
  }

  /** Espera a que acabe el scroll suave (evento `scrollend`, con un tope por si el navegador no lo emite). */
  private scrollEnd(): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        document.removeEventListener('scrollend', finish, true);
        resolve();
      };
      const timer = setTimeout(finish, 1600);
      document.addEventListener('scrollend', finish, true);
    });
  }
}
