import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface InfoDialogData {
  title: string;
  message: string;
  closeLabel?: string;
}

@Component({
  selector: 'app-info-dialog',
  standalone: true,
  template: `
    <div class="info-dialog">
      <p class="title">{{ data.title }}</p>
      <p class="message">{{ data.message }}</p>
      <div class="actions">
        <button type="button" class="btn primary" (click)="close()">{{ data.closeLabel ?? 'Entendido' }}</button>
      </div>
    </div>
  `,
  styles: [
    `
      .title {
        margin: 0 0 10px;
        font: 700 15px/1.3 var(--p4-font-display);
        color: var(--p4-text);
      }
      .message {
        margin: 0 0 20px;
        font: 400 13px/1.5 var(--p4-font-ui);
        color: var(--p4-muted);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      .btn {
        min-height: 40px;
        padding: 0 16px;
        border-radius: var(--p4-radius-pill);
        font: 600 12px/1 var(--p4-font-ui);
        border: 1px solid transparent;

        &.primary {
          background: var(--p4-accent);
          color: var(--p4-on-accent);
        }
      }
    `,
  ],
})
export class InfoDialogComponent {
  private readonly dialogRef = inject(DialogRef<void>);
  readonly data = inject<InfoDialogData>(DIALOG_DATA);

  close(): void {
    this.dialogRef.close();
  }
}
