import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { DIALOG_DATA } from '@angular/cdk/dialog';

export interface TrophyDetailData {
  id: string;
  name: string;
  count: number;
}

/**
 * Detalle de un trofeo de la Vitrina. Los trofeos de Piqo aun no tienen un
 * modelo de datos real en el backend (HANDOFF §18: "Para Copa Piqo falta
 * fijar el criterio"), asi que esta vitrina muestra honestamente que
 * ninguno se ha conseguido todavia (count 0), en vez de inventar datos.
 */
@Component({
  selector: 'app-trophy-detail-dialog',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="trophy-dialog">
      <piqo-svg [attr.trophy]="data.id" variant="detalle" size="96" [class.earned]="data.count > 0"></piqo-svg>
      <p class="name">{{ data.name }}</p>
      @if (data.count === 0) {
        <p class="status">Todavía sin conseguir</p>
      } @else if (data.count === 1) {
        <p class="status earned">Conseguido</p>
      } @else {
        <p class="status earned">Conseguido × {{ data.count }}</p>
      }
      <p class="hint">Un trofeo de Piqo significa ganar la competición de pronósticos del grupo, no el torneo real.</p>
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
      piqo-svg {
        color: var(--p4-disabled);
        margin-bottom: 4px;

        &.earned {
          color: var(--p4-accent);
        }
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
    `,
  ],
})
export class TrophyDetailDialogComponent {
  readonly data = inject<TrophyDetailData>(DIALOG_DATA);
}
