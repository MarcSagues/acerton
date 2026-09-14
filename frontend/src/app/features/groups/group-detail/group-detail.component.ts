import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { GroupDetailFacade } from './group-detail.facade';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, AvatarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
