import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { GroupInviteFacade } from './group-invite.facade';

@Component({
  selector: 'app-group-invite',
  standalone: true,
  imports: [RouterLink, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
