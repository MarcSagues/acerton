import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileStatsFacade } from './profile-stats.facade';

@Component({
  selector: 'app-profile-stats',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
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
