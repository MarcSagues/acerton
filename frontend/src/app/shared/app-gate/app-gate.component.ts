import { Component, inject } from '@angular/core';
import { AppGateService } from '../../core/app-client/app-gate.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Pantalla que tapa toda la app: "actualiza" o "en mantenimiento" (ver AppGateService). Sin forma de cerrarla. */
@Component({
  selector: 'app-gate',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './app-gate.component.html',
  styleUrl: './app-gate.component.scss',
})
export class AppGateComponent {
  readonly gate = inject(AppGateService);
}
