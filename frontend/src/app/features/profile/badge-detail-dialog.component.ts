import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { DIALOG_DATA } from '@angular/cdk/dialog';

export interface BadgeDetailData {
  artId: string | null;
  name: string;
  description: string;
  earned: boolean;
  percentage: number | null;
}

@Component({
  selector: 'app-badge-detail-dialog',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="badge-dialog">
      @if (data.artId) {
        <piqo-svg [attr.badge]="data.artId" [attr.state]="data.earned ? 'conseguida' : 'pendiente'" variant="detalle" size="96"></piqo-svg>
      } @else {
        <piqo-svg icon="medalla" size="64" [class.earned]="data.earned"></piqo-svg>
      }
      <p class="name">{{ data.name }}</p>
      <p class="status" [class.earned]="data.earned">{{ data.earned ? 'Conseguida' : 'Todavía sin conseguir' }}</p>
      <p class="rule">{{ data.description }}</p>
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
    `,
  ],
})
export class BadgeDetailDialogComponent {
  readonly data = inject<BadgeDetailData>(DIALOG_DATA);
}
