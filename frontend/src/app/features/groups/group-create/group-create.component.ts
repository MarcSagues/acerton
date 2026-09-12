import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { GroupCreateFacade } from './group-create.facade';

@Component({
  selector: 'app-group-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GroupCreateFacade],
  templateUrl: './group-create.component.html',
  styleUrl: './group-create.component.scss',
})
export class GroupCreateComponent implements OnInit {
  readonly page = inject(GroupCreateFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
