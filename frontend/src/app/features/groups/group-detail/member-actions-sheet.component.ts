import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';

export interface MemberAction {
  label: string;
  danger?: boolean;
  run: () => void;
}

export interface MemberActionsSheetData {
  memberName: string;
  actions: MemberAction[];
}

/** Panel inferior con las acciones disponibles para un miembro (promover/degradar/transferir/expulsar). */
@Component({
  selector: 'app-member-actions-sheet',
  standalone: true,
  template: `
    <div class="sheet-handle"></div>
    <p class="sheet-title">{{ data.memberName }}</p>
    <div class="sheet-list">
      @for (action of data.actions; track action.label) {
        <button type="button" class="action-row" [class.danger]="action.danger" (click)="run(action)">
          {{ action.label }}
        </button>
      }
    </div>
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
        margin: 0 0 12px;
        padding: 0 20px;
        font: 600 13px/1 var(--p4-font-ui);
        color: var(--p4-muted);
      }
      .sheet-list {
        display: flex;
        flex-direction: column;
      }
      .action-row {
        min-height: 52px;
        padding: 0 20px;
        display: flex;
        align-items: center;
        background: none;
        border: 0;
        border-top: 1px solid var(--p4-border);
        color: var(--p4-text);
        font: 500 14px/1 var(--p4-font-ui);
        text-align: left;

        &.danger {
          color: var(--p4-error);
        }
      }
    `,
  ],
})
export class MemberActionsSheetComponent {
  readonly data = inject<MemberActionsSheetData>(DIALOG_DATA);
  private readonly ref = inject(DialogRef<void>);
  private readonly sheet = inject(BottomSheetService);

  run(action: MemberAction): void {
    action.run();
    this.sheet.closeAnimated(this.ref);
  }
}
