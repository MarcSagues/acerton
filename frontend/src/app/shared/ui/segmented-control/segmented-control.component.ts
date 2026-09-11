import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, Output } from '@angular/core';

export interface SegmentOption<T> {
  value: T;
  label: string;
  icon?: string;
}

/** Selector segmentado de 2+ opciones (Filas/Visual, Semanal/Total). HANDOFF §6. */
@Component({
  selector: 'app-segmented-control',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="seg" role="group" [attr.aria-label]="ariaLabel">
      @for (opt of options; track opt.value) {
        <button
          type="button"
          class="seg-btn"
          [class.active]="opt.value === value"
          [attr.aria-pressed]="opt.value === value"
          (click)="select(opt.value)"
        >
          @if (opt.icon) {
            <piqo-svg [attr.icon]="opt.icon" size="18"></piqo-svg>
          }
          <span>{{ opt.label }}</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .seg {
        display: flex;
        padding: 4px;
        gap: 4px;
        border-radius: var(--p4-radius-md);
        background: var(--p4-surface);
        border: 1px solid var(--p4-border);
      }
      .seg-btn {
        flex: 1;
        height: 40px;
        border-radius: 10px;
        border: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: transparent;
        color: var(--p4-muted);
        font: 600 13px/1 var(--p4-font-ui);
        transition:
          background 120ms ease,
          color 120ms ease;
      }
      .seg-btn piqo-svg {
        color: inherit;
      }
      .seg-btn.active {
        background: var(--p4-soft);
        color: var(--p4-accent);
      }
      @media (prefers-reduced-motion: reduce) {
        .seg-btn {
          transition: none;
        }
      }
    `,
  ],
})
export class SegmentedControlComponent<T = string> {
  @Input() options: SegmentOption<T>[] = [];
  @Input() value: T | null = null;
  @Input() ariaLabel = '';
  @Output() valueChange = new EventEmitter<T>();

  select(value: T): void {
    if (value !== this.value) this.valueChange.emit(value);
  }
}
