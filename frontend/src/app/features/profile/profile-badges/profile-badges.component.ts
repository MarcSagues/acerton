import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileBadgesFacade } from './profile-badges.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { BadgeNamePipe, BadgeDescriptionPipe } from '../../../shared/utils/badge-text';

@Component({
  selector: 'app-profile-badges',
  standalone: true,
  imports: [SpinnerComponent, TranslatePipe, BadgeNamePipe, BadgeDescriptionPipe],
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
