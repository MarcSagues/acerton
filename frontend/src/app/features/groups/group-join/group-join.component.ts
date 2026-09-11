import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupJoinFacade } from './group-join.facade';

@Component({
  selector: 'app-group-join',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  providers: [GroupJoinFacade],
  template: `
    <div class="join-page">
      @if (page.errorMessage()) {
        <p>{{ page.errorMessage() }}</p>
        <button class="cta" (click)="page.goToGroups()">Ir a mis grupos</button>
      } @else {
        <mat-spinner diameter="32"></mat-spinner>
        <p>Uniendote al grupo...</p>
      }
    </div>
  `,
  styles: [
    `
      .join-page {
        min-height: 100vh;
        background: var(--bg);
        color: var(--text-primary);
        font-family: var(--font-ui);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: center;
        padding: 24px;
      }
      .cta {
        height: 48px;
        padding: 0 20px;
        border-radius: 14px;
        background: var(--accent);
        color: var(--accent-on);
        border: none;
        font: 600 14px/1 var(--font-ui);
        cursor: pointer;
      }
    `,
  ],
})
export class GroupJoinComponent implements OnInit {
  readonly page = inject(GroupJoinFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
