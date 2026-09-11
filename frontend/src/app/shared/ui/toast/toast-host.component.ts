import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Montado una vez en app.component.html. */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="piqo-toast-host" aria-live="polite">
      @for (m of toast.messages(); track m.id) {
        <div class="piqo-toast">
          <span>{{ m.text }}</span>
          @if (m.actionLabel) {
            <button
              type="button"
              (click)="
                m.action?.();
                toast.dismiss(m.id)
              "
            >
              {{ m.actionLabel }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  readonly toast = inject(ToastService);
}
