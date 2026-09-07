import { Component, computed, inject, signal } from '@angular/core';
import { PushNotificationsService } from '../../core/services/push-notifications.service';

const DISMISSED_KEY = 'quiniela.notifPromptDismissed';

/** El permiso nativo solo tiene sentido pedirlo cuando la app corre instalada (PWA), no en una pestana suelta del navegador. */
function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Banner que invita a activar las notificaciones push al abrir la app
 * instalada en movil, en vez de dejar que el usuario tenga que encontrar el
 * boton en Perfil por su cuenta. Se pregunta como mucho una vez: al
 * descartarlo o al pedir el permiso nativo (lo conceda o no), no se vuelve a
 * mostrar.
 */
@Component({
  selector: 'app-notification-prompt',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="prompt">
        <div class="text">
          <div class="title">Activa las notificaciones</div>
          <div class="sub">Te avisamos antes de que cierre la jornada.</div>
        </div>
        <div class="actions">
          <button class="btn ghost" (click)="dismiss()">Ahora no</button>
          <button class="btn primary" (click)="activate()">Activar</button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .prompt {
        margin: 10px 12px 0;
        padding: 12px 14px;
        border-radius: var(--radius-md);
        background: var(--surface);
        border: 1px solid var(--border-strong);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .text {
        flex: 1;
        min-width: 0;
      }

      .title {
        font: 600 13px/1.3 var(--font-ui);
      }

      .sub {
        font: 400 11px/1.4 var(--font-ui);
        color: var(--text-secondary);
        margin-top: 2px;
      }

      .actions {
        flex: none;
        display: flex;
        gap: 8px;
      }

      .btn {
        border: none;
        border-radius: var(--radius-pill);
        font: 600 11px/1 var(--font-ui);
        padding: 8px 12px;
        cursor: pointer;
        white-space: nowrap;
      }

      .btn.ghost {
        background: transparent;
        color: var(--text-secondary);
      }

      .btn.primary {
        background: var(--accent);
        color: var(--accent-on);
      }
    `,
  ],
})
export class NotificationPromptComponent {
  private readonly push = inject(PushNotificationsService);
  private readonly dismissed = signal(readDismissed());

  readonly visible = computed(() => {
    if (this.dismissed()) return false;
    if (!isStandaloneApp()) return false;
    if (!this.push.supported || !this.push.configured) return false;
    return this.push.permission() === 'default';
  });

  dismiss(): void {
    this.dismissed.set(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // almacenamiento no disponible (privado/bloqueado): simplemente no se recuerda entre sesiones
    }
  }

  async activate(): Promise<void> {
    await this.push.enable();
    this.dismiss();
  }
}
