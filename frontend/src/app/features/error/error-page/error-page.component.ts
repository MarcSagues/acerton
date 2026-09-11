import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './error-page.component.html',
  styleUrl: './error-page.component.scss',
})
export class ErrorPageComponent {
  reload(): void {
    window.location.reload();
  }
}
