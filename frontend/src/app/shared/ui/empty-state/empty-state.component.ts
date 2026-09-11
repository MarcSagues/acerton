import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Los 3 estados vacíos del arnés de demo del prototipo (sin-grupos,
 * sin-conexión, permiso bloqueado) generalizados como componente
 * reutilizable, montado donde corresponda de verdad en vez de como
 * pantalla de demo suelta.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="empty">
      <piqo-svg [attr.icon]="icon" size="32"></piqo-svg>
      <h2>{{ title }}</h2>
      <p>{{ text }}</p>
      @if (ctaLabel) {
        <button type="button" class="piqo-primary cta" (click)="cta.emit()">{{ ctaLabel }}</button>
      }
      @if (cta2Label) {
        <button type="button" class="piqo-secondary cta" (click)="cta2.emit()">{{ cta2Label }}</button>
      }
    </div>
  `,
  styles: [
    `
      .empty {
        padding: 40px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
        color: var(--p4-text);
      }
      piqo-svg {
        color: var(--p4-muted);
        margin-bottom: 4px;
      }
      h2 {
        margin: 0;
        font: 700 16px/1.3 var(--p4-font-display);
      }
      p {
        margin: 0;
        font: 400 13px/1.5 var(--p4-font-ui);
        color: var(--p4-muted);
        max-width: 280px;
      }
      .cta {
        min-height: var(--p4-touch);
        min-width: 200px;
        border-radius: var(--p4-radius-sm);
        font: 600 14px/1 var(--p4-font-ui);
        margin-top: 8px;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = 'info';
  @Input() title = '';
  @Input() text = '';
  @Input() ctaLabel?: string;
  @Input() cta2Label?: string;
  @Output() cta = new EventEmitter<void>();
  @Output() cta2 = new EventEmitter<void>();
}
