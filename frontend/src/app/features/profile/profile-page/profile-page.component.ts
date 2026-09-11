import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ProfilePageFacade } from './profile-page.facade';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatProgressSpinnerModule],
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