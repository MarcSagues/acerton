import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ForgotPasswordFacade } from './forgot-password.facade';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [ForgotPasswordFacade],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnInit {
  readonly page = inject(ForgotPasswordFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
