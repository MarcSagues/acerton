import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { GroupListFacade } from './group-list.facade';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, EmptyStateComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GroupListFacade],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss',
})
export class GroupListComponent implements OnInit {
  readonly page = inject(GroupListFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
