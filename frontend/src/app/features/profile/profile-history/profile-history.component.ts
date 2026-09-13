import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileHistoryFacade } from './profile-history.facade';

@Component({
  selector: 'app-profile-history',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [ProfileHistoryFacade],
  templateUrl: './profile-history.component.html',
  styleUrl: './profile-history.component.scss',
})
export class ProfileHistoryComponent implements OnInit {
  readonly page = inject(ProfileHistoryFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
