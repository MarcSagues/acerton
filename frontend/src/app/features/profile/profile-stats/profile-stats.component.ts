import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileStatsFacade } from './profile-stats.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-profile-stats',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [ProfileStatsFacade],
  templateUrl: './profile-stats.component.html',
  styleUrl: './profile-stats.component.scss',
})
export class ProfileStatsComponent implements OnInit {
  readonly page = inject(ProfileStatsFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
