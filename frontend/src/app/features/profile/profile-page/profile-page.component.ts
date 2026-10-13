import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeamFlagComponent } from '../../../shared/ui/team-flag/team-flag.component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { ProfilePageFacade } from './profile-page.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { BadgeNamePipe } from '../../../shared/utils/badge-text';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, AvatarComponent, TeamFlagComponent, TranslatePipe, BadgeNamePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [ProfilePageFacade],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  readonly page = inject(ProfilePageFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
