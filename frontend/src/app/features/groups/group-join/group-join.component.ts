import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { initials } from '../../../shared/utils/initials';
import { GroupJoinFacade } from './group-join.facade';

@Component({
  selector: 'app-group-join',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GroupJoinFacade],
  templateUrl: './group-join.component.html',
  styleUrl: './group-join.component.scss',
})
export class GroupJoinComponent implements OnInit {
  readonly page = inject(GroupJoinFacade);

  ngOnInit(): void {
    this.page.init();
  }

  initials(name: string): string {
    return initials(name);
  }
}
