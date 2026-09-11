import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { MemberDetailFacade } from './member-detail.facade';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, DatePipe],
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
