import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { currentLang } from '../../core/i18n/translate';
import { ChangelogChange, ChangelogEntry, changeText } from '../../core/changelog/changelog';

export interface WhatsNewDialogData {
  /** Versión instalada. */
  version: string;
  /** Novedades a enseñar, de la más nueva a la más antigua (más de una si se saltó alguna versión). */
  entries: readonly ChangelogEntry[];
}

/**
 * Pop-up de "novedades de esta versión" (ver WhatsNewService, que decide cuándo
 * sale y lo abre desde el shell). Solo informa: un botón para cerrar.
 */
@Component({
  selector: 'app-whats-new-dialog',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './whats-new-dialog.component.html',
  styleUrl: './whats-new-dialog.component.scss',
})
export class WhatsNewDialogComponent {
  private readonly dialogRef = inject(DialogRef<void>);
  readonly data = inject<WhatsNewDialogData>(DIALOG_DATA);

  readonly lang = currentLang();

  text(change: ChangelogChange): string {
    return changeText(change, this.lang);
  }

  close(): void {
    this.dialogRef.close();
  }
}
