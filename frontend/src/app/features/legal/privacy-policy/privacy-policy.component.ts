import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent {}
