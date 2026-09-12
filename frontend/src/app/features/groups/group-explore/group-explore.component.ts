import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { GroupExploreFacade, SCORING_MODE_OPTIONS } from './group-explore.facade';
import { GroupPreviewSheetComponent } from './group-preview-sheet.component';

@Component({
  selector: 'app-group-explore',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SegmentedControlComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GroupExploreFacade],
  templateUrl: './group-explore.component.html',
  styleUrl: './group-explore.component.scss',
})
export class GroupExploreComponent implements OnInit {
  readonly page = inject(GroupExploreFacade);
  readonly modeOptions = SCORING_MODE_OPTIONS;
  readonly filtersOpen = signal(false);

  private readonly router = inject(Router);
  private readonly bottomSheet = inject(BottomSheetService);

  ngOnInit(): void {
    this.page.init();
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  openPreview(groupId: string): void {
    this.page.openPreview(groupId);
    const ref = this.bottomSheet.open(GroupPreviewSheetComponent, { data: { page: this.page } });
    ref.closed.subscribe(() => this.page.closePreview());
  }
}
