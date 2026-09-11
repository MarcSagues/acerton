import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ActiveGroupService } from '../../../core/services/active-group.service';

@Component({
  selector: 'app-rules-and-prizes',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './rules-and-prizes.component.html',
  styleUrl: './rules-and-prizes.component.scss',
})
export class RulesAndPrizesComponent {
  readonly activeGroupService = inject(ActiveGroupService);
  readonly group = this.activeGroupService.activeGroup;
}
