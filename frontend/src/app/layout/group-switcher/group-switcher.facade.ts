import { Injectable, inject } from '@angular/core';
import { ActiveGroupService } from '../../core/services/active-group.service';

@Injectable()
export class GroupSwitcherFacade {
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly activeGroup = this.activeGroupService.activeGroup;
  readonly groups = this.activeGroupService.groups;

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  select(groupId: string): void {
    this.activeGroupService.setActive(groupId);
  }
}
