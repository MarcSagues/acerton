import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Router } from '@angular/router';

export interface TrophyDetailData {
  id: string;
  name: string;
  count: number;
  /** Anos en los que se conseguio, mas reciente primero. Solo relevante si count > 0. */
  years?: number[];
}

/**
 * Detalle de un trofeo de la Vitrina. Los trofeos de Piqo aun no tienen un
 * modelo de datos real en el backend (HANDOFF §18: "Para Copa Piqo falta
 * fijar el criterio"), asi que esta vitrina muestra honestamente que
 * ninguno se ha conseguido todavia (count 0) salvo cuando se rellenan
 * `years` a mano para previsualizar el diseno — ver TrophySeasonComponent,
 * que tambien deja claro que su contenido es de muestra.
 */
@Component({
  selector: 'app-trophy-detail-dialog',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="trophy-dialog">
      <img
        class="trophy-media"
        [src]="'assets/avatars/mascot/animated/cups/trophy-' + data.id + '-cup-animated.gif'"
        [alt]="data.name"
      />
      <p class="name">{{ data.name }}</p>
      @if (data.count === 0) {
        <p class="status">Todavía sin conseguir</p>
      } @else if (data.count === 1) {
        <p class="status earned">Conseguido</p>
      } @else {
        <p class="status earned">Conseguido × {{ data.count }}</p>
      }
      <p class="hint">Un trofeo de Piqo significa ganar la competición de pronósticos del grupo, no el torneo real.</p>

      @if (data.years?.length) {
        <div class="years">
          @for (year of data.years; track year) {
            <button type="button" class="year-btn" (click)="openSeason(year)">
              <span>{{ year }}</span>
              <piqo-svg icon="flecha" size="14"></piqo-svg>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .trophy-dialog {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
      }
      .trophy-media {
        width: 140px;
        height: 140px;
        object-fit: contain;
        margin-bottom: 4px;
        /* A color siempre aqui: el bloqueo en gris apagado es solo el
           preview de la vitrina (ver profile-page), antes de pulsar. */
      }
      .name {
        margin: 0;
        font: 700 16px/1.2 var(--p4-font-display);
        color: var(--p4-text);
      }
      .status {
        margin: 0;
        font: 600 11px/1 var(--p4-font-ui);
        color: var(--p4-disabled);

        &.earned {
          color: var(--p4-accent);
        }
      }
      .hint {
        margin: 4px 0 0;
        font: 400 12px/1.5 var(--p4-font-ui);
        color: var(--p4-muted);
      }
      .years {
        margin-top: 6px;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .year-btn {
        width: 100%;
        min-height: 44px;
        padding: 0 14px;
        border-radius: 12px;
        border: 1px solid var(--p4-border);
        background: var(--p4-soft);
        color: var(--p4-text);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font: 700 13px/1 var(--p4-font-display);

        piqo-svg {
          color: var(--p4-accent);
          margin-bottom: 0;
        }
      }
    `,
  ],
})
export class TrophyDetailDialogComponent {
  readonly data = inject<TrophyDetailData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<void>);
  private readonly router = inject(Router);

  openSeason(year: number): void {
    this.dialogRef.close();
    this.router.navigate(['/profile/trophies', this.data.id, year]);
  }
}
