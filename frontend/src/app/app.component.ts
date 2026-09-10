import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentComponent } from './shared/cookie-consent/cookie-consent.component';
import { NoRealMoneyNoticeComponent } from './shared/no-real-money-notice/no-real-money-notice.component';
import { TutorialCoachMarkComponent } from './shared/tutorial-coach-mark/tutorial-coach-mark.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CookieConsentComponent, NoRealMoneyNoticeComponent, TutorialCoachMarkComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
