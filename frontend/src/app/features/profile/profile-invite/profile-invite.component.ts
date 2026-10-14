import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileInviteFacade } from './profile-invite.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-profile-invite',
  standalone: true,
  imports: [FormsModule, SpinnerComponent, TranslatePipe],
  providers: [ProfileInviteFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-invite.component.html',
  styleUrl: './profile-invite.component.scss',
})
export class ProfileInviteComponent implements OnInit {
  readonly page = inject(ProfileInviteFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
