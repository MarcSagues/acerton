import { Injectable, inject } from '@angular/core';
import { ActiveGroupService } from '../../core/services/active-group.service';
import { ScoringMode } from '../../core/models/group.model';
import { scoringModeIcon as scoringModeIconOf } from '../../shared/utils/scoring-mode-badge';

@Injectable()
export class GroupSwitcherFacade {
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly activeGroup = this.activeGroupService.activeGroup;

  scoringModeIcon(mode: ScoringMode): string {
    return scoringModeIconOf(mode);
  }
}
