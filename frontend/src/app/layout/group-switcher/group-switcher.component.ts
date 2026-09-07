import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ActiveGroupService } from '../../core/services/active-group.service';

@Component({
  selector: 'app-group-switcher',
  standalone: true,
  imports: [RouterLink, MatMenuModule, MatIconModule],
  templateUrl: './group-switcher.component.html',
  styleUrl: './group-switcher.component.scss',
})
export class GroupSwitcherComponent {
  readonly activeGroupService = inject(ActiveGroupService);

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  select(groupId: string): void {
    this.activeGroupService.setActive(groupId);
  }
}
