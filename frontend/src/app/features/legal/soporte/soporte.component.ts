import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './soporte.component.html',
  styleUrl: './soporte.component.scss',
})
export class SoporteComponent {}
