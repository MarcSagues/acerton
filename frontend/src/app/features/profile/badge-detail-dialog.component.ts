import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BadgeProgress } from '../../core/models/badge-progress.model';

export interface BadgeDetailData {
  artId: string | null;
  name: string;
  description: string;
  earned: boolean;
  percentage: number | null;
  /** Solo para insignias no conseguidas cuya condicion es medible — null si no aplica. */
  progress: BadgeProgress | null;
}

@Component({
  selector: 'app-badge-detail-dialog',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="badge-dialog">
      @if (data.artId) {
        <span class="art-wrap">
          <img class="art-animated" [src]="'/piqo/insignias/animadas/' + data.artId + '.webp'" [alt]="data.name" />
          <img class="art-static" [src]="'/piqo/insignias/3d/' + data.artId + '.png'" [alt]="data.name" />
        </span>
      } @else {
        <piqo-svg icon="medalla" size="64" [class.earned]="data.earned"></piqo-svg>
      }
      <p class="name">{{ data.name }}</p>
      <p class="status" [class.earned]="data.earned">{{ data.earned ? 'Conseguida' : 'Todavía sin conseguir' }}</p>
      <p class="rule">{{ data.description }}</p>
      @if (data.progress; as progress) {
        <div class="progress-row">
          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="(progress.current / progress.target) * 100"></div>
          </div>
          <span class="progress-label mono">{{ progress.current }}/{{ progress.target }}</span>
        </div>
      }
      @if (data.percentage != null) {
        <p class="stat">La tienen el {{ data.percentage }}% de los jugadores.</p>
      }
    </div>
  `,
  styles: [
    `
      .badge-dialog {
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
      .art-wrap {
        display: block;
        margin-bottom: 4px;
        /* A color y animada siempre aqui, este consiga o no la insignia:
           el bloqueo en gris apagado es solo el preview de antes de
           pulsar (ver profile-page/profile-badges), igual que ya pasa
           con los trofeos de la Vitrina. */
      }
      .art-animated,
      .art-static {
        width: 120px;
        height: 120px;
        object-fit: contain;
      }
      /* Por defecto se ve la version animada; solo la estatica (misma
         ilustracion, sin movimiento) si el usuario prefiere menos
         animaciones en el sistema. */
      .art-wrap .art-static {
        display: none;
      }
      @media (prefers-reduced-motion: reduce) {
        .art-wrap .art-animated {
          display: none;
        }
        .art-wrap .art-static {
          display: block;
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
        letter-spacing: 0.06em;
        color: var(--p4-disabled);

        &.earned {
          color: var(--p4-accent);
        }
      }
      .rule {
        margin: 4px 0 0;
        font: 400 12px/1.5 var(--p4-font-ui);
        color: var(--p4-muted);
      }
      .stat {
        margin: 6px 0 0;
        padding: 6px 12px;
        border-radius: var(--p4-radius-pill);
        background: var(--p4-soft);
        color: var(--p4-accent);
        font: 600 11px/1 var(--p4-font-ui);
      }
      .progress-row {
        width: 100%;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .progress-track {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: var(--p4-soft);
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: var(--p4-accent);
        transition: width 200ms ease;
      }
      .progress-label {
        flex: none;
        font-size: 10px;
        color: var(--p4-muted);
      }
    `,
  ],
})
export class BadgeDetailDialogComponent {
  readonly data = inject<BadgeDetailData>(DIALOG_DATA);
}
