import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AuthPageFacade } from './auth-page.facade';
import { NativeAppleButtonDirective } from './native-apple-button.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent, NativeAppleButtonDirective, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [AuthPageFacade],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
})
export class AuthPageComponent implements OnInit {
  readonly page = inject(AuthPageFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
