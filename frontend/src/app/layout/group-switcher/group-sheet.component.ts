import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { ActiveGroupService } from '../../core/services/active-group.service';
import { BottomSheetService } from '../../shared/ui/bottom-sheet/bottom-sheet.service';
import { initials } from '../../shared/utils/initials';

/** Contenido del panel inferior "Selector de grupo". HANDOFF §10. */
@Component({
  selector: 'app-group-sheet',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './group-sheet.component.html',
  styleUrl: './group-sheet.component.scss',
})
export class GroupSheetComponent {
  readonly activeGroupService = inject(ActiveGroupService);
  private readonly ref = inject(DialogRef<void>);
  private readonly sheet = inject(BottomSheetService);
  private readonly router = inject(Router);

  initials(name: string): string {
    return initials(name);
  }

  select(groupId: string): void {
    this.activeGroupService.setActive(groupId);
    this.sheet.closeAnimated(this.ref);
  }

  close(): void {
    this.sheet.closeAnimated(this.ref);
  }

  goToAllGroups(): void {
    this.sheet.closeAnimated(this.ref);
    this.router.navigateByUrl('/groups');
  }
}
