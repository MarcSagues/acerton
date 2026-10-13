import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ProfileNameFacade } from './profile-name.facade';

/** Pestaña «Nombre» de Ajustes. */
@Component({
  selector: 'app-profile-name',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslatePipe],
  providers: [ProfileNameFacade],
  templateUrl: './profile-name.component.html',
  styleUrl: './profile-name.component.scss',
})
export class ProfileNameComponent {
  readonly page = inject(ProfileNameFacade);
}
