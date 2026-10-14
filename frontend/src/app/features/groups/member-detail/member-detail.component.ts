import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeamFlagComponent } from '../../../shared/ui/team-flag/team-flag.component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { MemberDetailFacade } from './member-detail.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { BadgeNamePipe } from '../../../shared/utils/badge-text';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, AvatarComponent, TeamFlagComponent, TranslatePipe, BadgeNamePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [MemberDetailFacade],
  templateUrl: './member-detail.component.html',
  styleUrl: './member-detail.component.scss',
})
export class MemberDetailComponent implements OnInit {
  readonly page = inject(MemberDetailFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
