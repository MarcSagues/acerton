import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CHANGELOG } from '../changelog/changelog';
import { decideWhatsNew } from '../changelog/changelog.rules';
import { PiqoDialogService } from '../../shared/ui/dialog/dialog.service';
import { WhatsNewDialogComponent, WhatsNewDialogData } from '../../features/whats-new/whats-new-dialog.component';
import { TutorialService } from './tutorial.service';

/** Última versión de la app para la que ya se decidió qué enseñar, por dispositivo (no por cuenta: se actualiza cada dispositivo). */
export const LAST_SEEN_VERSION_KEY = 'acerton.lastSeenVersion';

/**
 * Pop-up de novedades: la primera vez que se abre una versión nueva de la app
 * enseña la lista de cambios de esa versión (ver core/changelog). Solo una vez
 * por versión y dispositivo: la versión se apunta al abrir el aviso, no al
 * cerrarlo, así que no vuelve a salir aunque se cierre la app con él abierto.
 */
@Injectable({ providedIn: 'root' })
export class WhatsNewService {
  private readonly dialog = inject(PiqoDialogService);
  private readonly tutorial = inject(TutorialService);

  async checkOnLaunch(): Promise<void> {
    const currentVersion = await this.installedVersion();
    if (!currentVersion) return;

    const decision = decideWhatsNew({
      changelog: CHANGELOG,
      currentVersion,
      lastSeenVersion: this.readLastSeen(),
      isNewUser: !this.tutorial.hasSeenTutorial(),
    });
    if (decision.action === 'none') return;

    this.writeLastSeen(currentVersion);
    if (decision.action === 'show') {
      this.dialog.open<WhatsNewDialogComponent, void, WhatsNewDialogData>(WhatsNewDialogComponent, {
        data: { version: currentVersion, entries: decision.entries },
      });
    }
  }

  /**
   * En la app nativa, la versión instalada (MARKETING_VERSION en iOS). En la web
   * no hay versión instalada que consultar: se toma la última del historial, así
   * que cada despliegue con una entrada nueva la enseña una vez.
   */
  private async installedVersion(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return CHANGELOG[0]?.version ?? null;
    try {
      return (await App.getInfo()).version;
    } catch {
      return null;
    }
  }

  private readLastSeen(): string | null {
    try {
      return localStorage.getItem(LAST_SEEN_VERSION_KEY);
    } catch {
      return null;
    }
  }

  private writeLastSeen(version: string): void {
    try {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
    } catch {
      /* Sin localStorage (modo privado, cuota llena): saldrá otra vez al abrir; no es grave. */
    }
  }
}
