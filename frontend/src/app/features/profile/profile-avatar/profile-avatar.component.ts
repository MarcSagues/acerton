import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { ProfileAvatarFacade } from './profile-avatar.facade';

@Component({
  selector: 'app-profile-avatar',
  standalone: true,
  imports: [SpinnerComponent, AvatarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [ProfileAvatarFacade],
  templateUrl: './profile-avatar.component.html',
  styleUrl: './profile-avatar.component.scss',
})
export class ProfileAvatarComponent implements OnInit {
  readonly page = inject(ProfileAvatarFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
