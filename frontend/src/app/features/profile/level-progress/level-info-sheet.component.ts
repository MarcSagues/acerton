import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { XP_GROUPS } from './level-progress.domain';

/** Contenido del panel inferior "Cómo ganar XP", abierto desde LevelProgressComponent. */
@Component({
  selector: 'app-level-info-sheet',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './level-info-sheet.component.html',
  styleUrl: './level-info-sheet.component.scss',
})
export class LevelInfoSheetComponent {
  private readonly ref = inject(DialogRef<void>);
  private readonly sheet = inject(BottomSheetService);

  readonly groups = XP_GROUPS;

  close(): void {
    this.sheet.closeAnimated(this.ref);
  }
}
