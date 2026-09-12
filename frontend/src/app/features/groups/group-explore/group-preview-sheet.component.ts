import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { initials } from '../../../shared/utils/initials';
import { GroupExploreFacade } from './group-explore.facade';

export interface GroupPreviewSheetData {
  page: GroupExploreFacade;
}

/**
 * Panel inferior con el detalle de un grupo publico (reglas reales, ligas y
 * top 5) sin crear membresia. Reutiliza el mismo GroupExploreFacade que la
 * lista (pasado por DIALOG_DATA) en vez de duplicar el estado de la
 * vista previa o volver a pedirla.
 */
@Component({
  selector: 'app-group-preview-sheet',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './group-preview-sheet.component.html',
  styleUrl: './group-preview-sheet.component.scss',
})
export class GroupPreviewSheetComponent {
  readonly data = inject<GroupPreviewSheetData>(DIALOG_DATA);
  readonly page = this.data.page;
  private readonly ref = inject(DialogRef<void>);

  close(): void {
    this.ref.close();
  }

  join(groupId: string): void {
    this.page.join(groupId, () => this.ref.close());
  }

  initials(name: string): string {
    return initials(name);
  }
}
