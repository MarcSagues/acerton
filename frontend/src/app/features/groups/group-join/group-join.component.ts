import { Component, OnInit, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { GroupJoinFacade } from './group-join.facade';

@Component({
  selector: 'app-group-join',
  standalone: true,
  imports: [SpinnerComponent],
  providers: [GroupJoinFacade],
  template: `
    <div class="join-page">
      @if (page.errorMessage()) {
        <p>{{ page.errorMessage() }}</p>
        <button class="cta" (click)="page.goToGroups()">Ir a mis grupos</button>
      } @else {
        <app-spinner [size]="32"></app-spinner>
        <p>Uniéndote al grupo...</p>
      }
    </div>
  `,
  styles: [
    `
      .join-page {
        min-height: 100vh;
        background: var(--p4-bg);
        color: var(--p4-text);
        font-family: var(--p4-font-ui);
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
        background: var(--p4-accent);
        color: var(--p4-on-accent);
        border: none;
        font: 600 14px/1 var(--p4-font-ui);
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
