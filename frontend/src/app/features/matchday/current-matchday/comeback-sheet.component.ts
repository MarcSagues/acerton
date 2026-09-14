import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { DoubleChanceOption } from '../../../core/models/prediction.model';

export interface ComebackSheetData {
  homeTeam: string;
  awayTeam: string;
  /** Comodines que le quedan al usuario esta jornada, sin contar el de este partido si ya estaba usado aqui. */
  remaining: number;
  current: DoubleChanceOption | null;
}

export type ComebackSheetResult = { option: DoubleChanceOption } | { remove: true };

const DOUBLE_CHANCE_OPTIONS: { v: DoubleChanceOption; l: string }[] = [
  { v: 'HOME_OR_DRAW', l: '1X' },
  { v: 'DRAW_OR_AWAY', l: 'X2' },
  { v: 'HOME_OR_AWAY', l: '12' },
];

/**
 * Panel inferior para activar/cambiar/quitar el comodin de remontada en un
 * partido, abierto al mantener pulsada la fila de pronostico (ver
 * current-matchday.facade.ts openComebackSheet) en vez de un boton fijo
 * junto a las opciones 1/X/2.
 */
@Component({
  selector: 'app-comeback-sheet',
  standalone: true,
  template: `
    <div class="sheet-handle"></div>
    <p class="sheet-title">Comodín de remontada</p>
    <p class="sheet-teams">{{ data.homeTeam }} - {{ data.awayTeam }}</p>
    <p class="sheet-remaining">{{ remainingLabel() }}</p>
    <div class="sheet-options">
      @for (opt of options; track opt.v) {
        <button type="button" class="opt" [class.selected]="data.current === opt.v" (click)="pick(opt.v)">
          {{ opt.l }}
        </button>
      }
    </div>
    @if (data.current) {
      <button type="button" class="remove-btn" (click)="remove()">Quitar comodín</button>
    }
  `,
  styles: [
    `
      .sheet-handle {
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--p4-border);
        margin: 0 auto 12px;
      }
      .sheet-title {
        margin: 0;
        padding: 0 20px;
        font: 700 15px/1.3 var(--p4-font-display);
        color: var(--p4-text);
      }
      .sheet-teams {
        margin: 4px 0 0;
        padding: 0 20px;
        font: 500 13px/1.4 var(--p4-font-ui);
        color: var(--p4-muted);
      }
      .sheet-remaining {
        margin: 10px 20px 0;
        padding: 8px 12px;
        border-radius: 10px;
        background: var(--p4-soft);
        color: var(--p4-accent);
        font: 600 12px/1.3 var(--p4-font-ui);
      }
      .sheet-options {
        display: flex;
        gap: 8px;
        padding: 16px 20px 0;
      }
      .opt {
        flex: 1;
        min-height: var(--p4-touch);
        border-radius: 12px;
        border: 1px solid var(--p4-border);
        background: var(--p4-surface);
        color: var(--p4-text);
        font: 700 15px/1 var(--p4-font-ui);

        &.selected {
          background: var(--p4-soft);
          border-color: var(--p4-accent);
          color: var(--p4-accent);
        }
      }
      .remove-btn {
        display: block;
        width: calc(100% - 40px);
        margin: 12px 20px 4px;
        min-height: 44px;
        border-radius: 10px;
        background: none;
        border: 0;
        color: var(--p4-error);
        font: 600 14px/1 var(--p4-font-ui);
      }
    `,
  ],
})
export class ComebackSheetComponent {
  readonly data = inject<ComebackSheetData>(DIALOG_DATA);
  private readonly ref = inject(DialogRef<ComebackSheetResult | undefined>);
  private readonly sheet = inject(BottomSheetService);
  readonly options = DOUBLE_CHANCE_OPTIONS;

  remainingLabel(): string {
    if (this.data.current) return 'Ya activo en este partido';
    return this.data.remaining === 1
      ? 'Te queda 1 comodín esta jornada'
      : `Te quedan ${this.data.remaining} comodines esta jornada`;
  }

  pick(option: DoubleChanceOption): void {
    this.sheet.closeAnimated(this.ref, { option });
  }

  remove(): void {
    this.sheet.closeAnimated(this.ref, { remove: true });
  }
}
