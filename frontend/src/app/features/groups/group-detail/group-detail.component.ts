import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { GroupDetailFacade } from './group-detail.facade';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  providers: [GroupDetailFacade],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent implements OnInit {
  readonly page = inject(GroupDetailFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
