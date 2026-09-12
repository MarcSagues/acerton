import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <svg [style.width.px]="size" [style.height.px]="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3A9 9 0 1 1 3 12"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        class="ring"
      />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        color: var(--p4-accent);
      }
      .ring {
        transform-origin: 12px 12px;
        animation: piqoSpin 0.8s linear infinite;
      }
    `,
  ],
})
export class SpinnerComponent {
  @Input() size = 20;
}
