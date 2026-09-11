import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { GroupJoinCodeFacade } from './group-join-code.facade';

@Component({
  selector: 'app-group-join-code',
  standalone: true,
  imports: [ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GroupJoinCodeFacade],
  templateUrl: './group-join-code.component.html',
  styleUrl: './group-join-code.component.scss',
})
export class GroupJoinCodeComponent {
  readonly page = inject(GroupJoinCodeFacade);
}
