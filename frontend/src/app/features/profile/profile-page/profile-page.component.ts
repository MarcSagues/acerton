import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfilePageFacade } from './profile-page.facade';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SpinnerComponent],
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
