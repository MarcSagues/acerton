import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { CopySource } from '../../../core/models/prediction.model';
import { ScoringMode } from '../../../core/models/group.model';
import { copySourceSubtitle } from '../domain/copy-predictions.rules';

export interface CopyFromGroupSheetData {
  sources: CopySource[];
  /** Modo de juego del grupo actual (el destino): decide que grupos se pueden copiar tal cual. */
  targetMode: ScoringMode;
}

/**
 * Panel inferior para elegir de que otro grupo copiar los pronosticos de la
 * jornada abierta (ver CurrentMatchdayFacade.openCopySheet). Devuelve el
 * grupo elegido, o nada si se cierra sin elegir.
 */
@Component({
  selector: 'app-copy-from-group-sheet',
  standalone: true,
  template: `
    <div class="sheet-handle"></div>
    <p class="sheet-title">Copiar de otro grupo</p>
    <p class="sheet-lead">
      Rellena todos los partidos de esta jornada con tus pronósticos de ese grupo. Después puedes cambiar los que quieras.
    </p>
    <ul class="sources">
      @for (source of data.sources; track source.groupId) {
        <li>
          <button type="button" class="source" [disabled]="!source.compatible" (click)="pick(source)">
            <span class="source-name">{{ source.name }}</span>
            <span class="source-sub">{{ subtitle(source) }}</span>
          </button>
        </li>
      }
    </ul>
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
      .sheet-lead {
        margin: 6px 0 0;
        padding: 0 20px;
        font: 400 13px/1.45 var(--p4-font-ui);
        color: var(--p4-muted);
      }
      .sources {
        list-style: none;
        margin: 14px 0 8px;
        padding: 0 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 50vh;
        overflow-y: auto;
      }
      .source {
        width: 100%;
        min-height: var(--p4-touch);
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid var(--p4-border);
        background: var(--p4-surface);
        color: var(--p4-text);
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 3px;

        &:disabled {
          opacity: 0.55;
        }
      }
      .source-name {
        font: 700 14px/1.2 var(--p4-font-ui);
      }
      .source-sub {
        font: 400 12px/1.35 var(--p4-font-ui);
        color: var(--p4-muted);
      }
    `,
  ],
})
export class CopyFromGroupSheetComponent {
  readonly data = inject<CopyFromGroupSheetData>(DIALOG_DATA);
  private readonly ref = inject(DialogRef<CopySource | undefined>);
  private readonly sheet = inject(BottomSheetService);

  subtitle(source: CopySource): string {
    return copySourceSubtitle(source, this.data.targetMode);
  }

  pick(source: CopySource): void {
    this.sheet.closeAnimated(this.ref, source);
  }
}
