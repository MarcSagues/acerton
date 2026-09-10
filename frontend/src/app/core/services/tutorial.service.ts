import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ScoringMode } from '../models/group.model';
import { ProfileService } from './profile.service';
import { AuthService } from './auth.service';

export interface TutorialStep {
  id: string;
  /** Ruta donde vive el elemento a senalar — el aviso solo se muestra estando en ella. */
  route: string;
  /** Selector CSS del elemento real a resaltar (atributos data-tutorial="..." en la plantilla). */
  target: string;
  title: string;
  body: string;
  placement: 'top' | 'bottom';
  /**
   * 'manual': se avanza con el boton del propio aviso.
   * 'route': se avanza solo, en cuanto la navegacion real llega a la ruta del siguiente paso —
   * pensado para el paso que senala un boton de navegacion, sin forzar ninguna accion real de juego.
   */
  advanceOn: 'manual' | 'route';
}

function buildSteps(scoringMode: ScoringMode): TutorialStep[] {
  return [
    {
      id: 'tabla',
      route: '/rankings',
      target: '[data-tutorial="rankings-head"]',
      title: 'Bienvenido a Quiniela',
      body: 'Esta es la Tabla: aqui ves la clasificacion general del grupo, quien va primero y cuantos puntos lleva cada uno.',
      placement: 'bottom',
      advanceOn: 'manual',
    },
    {
      id: 'nav-jornada',
      route: '/rankings',
      target: '[data-tutorial="nav-jornada"]',
      title: 'Haz tus pronosticos',
      body: 'Pulsa aqui para ver los proximos partidos y elegir tus pronosticos antes de que empiecen.',
      placement: 'top',
      advanceOn: 'route',
    },
    scoringMode === 'EXACT_SCORE'
      ? {
          id: 'matchday-choices',
          route: '/matchday',
          target: '[data-tutorial="first-match"]',
          title: 'Resultado exacto',
          body: 'Para cada partido, escribe el marcador exacto que crees que va a pasar. Cuanto mas te acerques al resultado real, mas puntos consigues.',
          placement: 'top',
          advanceOn: 'manual',
        }
      : {
          id: 'matchday-choices',
          route: '/matchday',
          target: '[data-tutorial="first-match"]',
          title: 'Elige 1, X o 2',
          body: 'Para cada partido, elige 1 (gana el local), X (empate) o 2 (gana el visitante) — se guarda solo al pulsar. Si vas por detras en la clasificacion, puede que tengas el comodin de doble oportunidad disponible en algunos partidos.',
          placement: 'top',
          advanceOn: 'manual',
        },
    {
      id: 'nav-profile',
      route: '/matchday',
      target: '[data-tutorial="nav-perfil"]',
      title: 'Grupos y Perfil',
      body: '"Grupos" te deja cambiar entre tus grupos o crear/unirte a otro. Desde "Perfil" puedes volver a ver este tutorial cuando quieras.',
      placement: 'top',
      advanceOn: 'manual',
    },
  ];
}

/**
 * Recorrido guiado (product-rules.md § Tutorial): se inicia al entrar por
 * primera vez en un grupo, empieza en Tabla y de ahi explica el acceso a
 * Jornada, adaptado al modo de puntuacion. Cada paso senala un elemento real
 * de la interfaz en vez de ser texto suelto — ver TutorialCoachMarkComponent
 * (montado globalmente) para el resaltado y la burbuja.
 */
@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  private readonly activeSignal = signal(false);
  private readonly stepIndexSignal = signal(0);
  private readonly scoringModeSignal = signal<ScoringMode>('ONE_X_TWO');
  private readonly currentUrlSignal = signal(this.router.url);

  readonly steps = computed(() => buildSteps(this.scoringModeSignal()));

  /** Solo visible cuando el paso activo pertenece a la ruta en la que realmente se esta. */
  readonly currentStep = computed(() => {
    if (!this.activeSignal()) return null;
    const step = this.steps()[this.stepIndexSignal()];
    if (!step) return null;
    return step.route === this.currentUrlSignal() ? step : null;
  });

  readonly isLastStep = computed(() => this.stepIndexSignal() === this.steps().length - 1);

  constructor() {
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      const url = event.urlAfterRedirects.split('?')[0];
      this.currentUrlSignal.set(url);
      if (!this.activeSignal()) return;

      const current = this.steps()[this.stepIndexSignal()];
      const next = this.steps()[this.stepIndexSignal() + 1];
      if (current?.advanceOn === 'route' && next && next.route === url) {
        this.stepIndexSignal.update((i) => i + 1);
      }
    });
  }

  /** No hace nada si ya se completo antes — solo se llama tras comprobar user.tutorialCompleted. */
  start(scoringMode: ScoringMode): void {
    this.scoringModeSignal.set(scoringMode);
    this.stepIndexSignal.set(0);
    this.currentUrlSignal.set(this.router.url.split('?')[0]);
    this.activeSignal.set(true);
  }

  /** El paso actual senala un objetivo que no existe en pantalla (p. ej. grupo sin partidos): se salta sin bloquear. */
  skipCurrentStep(): void {
    if (this.isLastStep()) {
      this.finish();
      return;
    }
    this.stepIndexSignal.update((i) => i + 1);
  }

  next(): void {
    if (this.isLastStep()) {
      this.finish();
      return;
    }
    this.stepIndexSignal.update((i) => i + 1);
  }

  skip(): void {
    this.finish();
  }

  private finish(): void {
    this.activeSignal.set(false);
    this.profileService.completeTutorial().subscribe((user) => this.authService.setCurrentUser(user));
  }
}
