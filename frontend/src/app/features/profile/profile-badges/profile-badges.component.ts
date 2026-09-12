import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileBadgesFacade } from './profile-badges.facade';

@Component({
  selector: 'app-profile-badges',
  standalone: true,
  imports: [SpinnerComponent],
  providers: [ProfileBadgesFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-badges.component.html',
  styleUrl: './profile-badges.component.scss',
})
export class ProfileBadgesComponent implements OnInit {
  readonly page = inject(ProfileBadgesFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
