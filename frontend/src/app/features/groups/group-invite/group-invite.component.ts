import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { GroupInviteFacade } from './group-invite.facade';

@Component({
  selector: 'app-group-invite',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule],
  providers: [GroupInviteFacade],
  templateUrl: './group-invite.component.html',
  styleUrl: './group-invite.component.scss',
})
export class GroupInviteComponent implements OnInit {
  readonly page = inject(GroupInviteFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
