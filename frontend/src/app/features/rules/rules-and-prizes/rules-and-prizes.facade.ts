import { Injectable, computed, inject, signal } from '@angular/core';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { scoringModeLabel, scoringRules } from '../domain/scoring-rules';

@Injectable()
export class RulesAndPrizesFacade {
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly prizeCalloutDismissed = signal(false);

  readonly group = this.activeGroupService.activeGroup;
  readonly modeLabel = computed(() => {
    const group = this.group();
    return group ? scoringModeLabel(group.scoringMode) : '';
  });
  readonly rules = computed(() => {
    const group = this.group();
    return group ? scoringRules(group.scoringMode) : [];
  });
  readonly showComeback = computed(() => this.group()?.scoringMode === 'ONE_X_TWO');
  readonly prizeSectionNumber = computed(() => (this.showComeback() ? '03' : '02'));
}
