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
  /**
   * Mascota del catalogo de avatares (ver avatar-catalog.ts en el backend)
   * que "explica" este paso, para que el tutorial se lea como una guia
   * hecha por un personaje en vez de texto suelto. Solo poses del catalogo
   * por defecto (nunca las de trofeo: no tiene sentido condicionar el
   * tutorial a haberlas desbloqueado).
   */
  mascotId: string;
  /** Donde se coloca la mascota respecto al mensaje (no respecto al objetivo senalado). */
  mascotPosition: 'above' | 'below';
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
      title: 'Bienvenido a Piqo',
      body: 'Esta es la Tabla: aquí ves la clasificación general del grupo, quién va primero y cuántos puntos lleva cada uno.',
      mascotId: 'saludo',
      mascotPosition: 'below',
      placement: 'bottom',
      advanceOn: 'manual',
    },
    {
      id: 'nav-jornada',
      route: '/rankings',
      target: '[data-tutorial="nav-jornada"]',
      title: 'Haz tus pronósticos',
      body: 'Pulsa aquí para ver los próximos partidos y elegir tus pronósticos antes de que empiecen.',
      mascotId: 'corriendo',
      mascotPosition: 'above',
      placement: 'top',
      advanceOn: 'route',
    },
    scoringMode === 'EXACT_SCORE'
      ? {
          id: 'matchday-choices',
          route: '/matchday',
          target: '[data-tutorial="first-match"]',
          title: 'Resultado exacto',
          body: 'Para cada partido, escribe el marcador exacto que crees que va a pasar. Cuanto más te acerques al resultado real, más puntos consigues.',
          mascotId: 'pensando',
          mascotPosition: 'above',
          placement: 'top',
          advanceOn: 'manual',
        }
      : {
          id: 'matchday-choices',
          route: '/matchday',
          target: '[data-tutorial="first-match"]',
          title: 'Elige 1, X o 2',
          body: 'Para cada partido, elige 1 (gana el local), X (empate) o 2 (gana el visitante) — se guarda solo al pulsar. Si vas por detrás en la clasificación, puede que tengas el comodín de doble oportunidad disponible en algunos partidos.',
          mascotId: 'pensando',
          mascotPosition: 'above',
          placement: 'top',
          advanceOn: 'manual',
        },
    {
      id: 'nav-profile',
      route: '/matchday',
      target: '[data-tutorial="nav-perfil"]',
      title: 'Grupos y Perfil',
      body: '"Grupos" te deja cambiar entre tus grupos o crear/unirte a otro. Desde "Perfil" puedes volver a ver este tutorial cuando quieras.',
      mascotId: 'celebrando',
      mascotPosition: 'above',
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

  /**
   * Respaldo local (ademas de user.tutorialCompleted en el backend): en
   * iOS se vio el aviso reaparecer en cada pulsacion de "Tabla" porque el
   * PATCH de completeTutorial fallaba en silencio (red del dispositivo) y
   * el flag del servidor nunca llegaba a ponerse a true — sin nada mas que
   * lo recuerde, el guard de RankingsPageFacade volvia a intentarlo cada
   * vez. localStorage no depende de la red: una vez mostrado en este
   * dispositivo, no se le vuelve a interrumpir aunque el PATCH seguido
   * siga fallando (que se sigue reintentando en segundo plano igual).
   */
  private readonly LOCAL_SEEN_KEY = 'piqo-tutorial-seen';

  private markSeenLocally(): void {
    try {
      localStorage.setItem(this.LOCAL_SEEN_KEY, '1');
    } catch {
      /* Sin localStorage (modo privado, cuota llena): sin respaldo local, solo el flag del backend. */
    }
  }

  hasSeenTutorial(): boolean {
    if (this.authService.currentUser()?.tutorialCompleted) return true;
    try {
      return localStorage.getItem(this.LOCAL_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  }

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

  /**
   * No hace nada si ya se completo antes — solo se llama tras comprobar
   * user.tutorialCompleted. Marca el tutorial como completado en el
   * backend ya al empezarlo (no solo al terminarlo o saltarlo): antes,
   * si el usuario se iba de Tabla a media explicacion sin pulsar ningun
   * boton del propio aviso, el flag se quedaba en false y el tutorial
   * volvia a saltar en cada visita futura a Tabla (o al entrar en otro
   * grupo). "Se ha visto" ahora significa "se ha mostrado una vez",
   * independientemente de si se completan todos los pasos.
   */
  start(scoringMode: ScoringMode): void {
    this.scoringModeSignal.set(scoringMode);
    this.stepIndexSignal.set(0);
    this.currentUrlSignal.set(this.router.url.split('?')[0]);
    this.activeSignal.set(true);
    this.markSeenLocally();
    if (!this.authService.currentUser()?.tutorialCompleted) {
      // Sin manejador de error aqui, un fallo de red (frecuente en datos
      // moviles) dejaba esta llamada sin completarse nunca: el usuario
      // seguia viendo tutorialCompleted=false en cada visita futura a
      // Tabla y el tutorial volvia a saltar siempre, indefinidamente. Al
      // fallar simplemente no se actualiza el signal local — el propio
      // guard de arriba hace que se reintente solo la proxima vez que se
      // llame a start(), y completeTutorial() es idempotente en el backend.
      this.profileService.completeTutorial().subscribe({
        next: (user) => this.authService.setCurrentUser(user),
        error: () => {
          /* reintento implicito: la proxima llamada a start() lo repite */
        },
      });
    }
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
