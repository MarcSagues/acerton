import { Injectable, inject } from '@angular/core';
import { ActiveGroupService } from '../../core/services/active-group.service';
import { initials } from '../../shared/utils/initials';

@Injectable()
export class GroupSwitcherFacade {
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly activeGroup = this.activeGroupService.activeGroup;

  initials(name: string): string {
    return initials(name);
  }
}
