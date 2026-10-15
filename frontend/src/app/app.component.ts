import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentComponent } from './shared/cookie-consent/cookie-consent.component';
import { NoRealMoneyNoticeComponent } from './shared/no-real-money-notice/no-real-money-notice.component';
import { TutorialCoachMarkComponent } from './shared/tutorial-coach-mark/tutorial-coach-mark.component';
import { ToastHostComponent } from './shared/ui/toast/toast-host.component';
import { ThemeService } from './core/services/theme.service';
import { DeepLinkService } from './core/services/deep-link.service';
import { EdgeSwipeBackService } from './core/services/edge-swipe-back.service';
import { KeyboardInsetService } from './core/services/keyboard-inset.service';
import { ScrollTopService } from './core/services/scroll-top.service';
import { KeyboardAccessoryComponent } from './shared/ui/keyboard-accessory/keyboard-accessory.component';
import { AppGateComponent } from './shared/app-gate/app-gate.component';
import { AppGateService } from './core/app-client/app-gate.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CookieConsentComponent,
    NoRealMoneyNoticeComponent,
    TutorialCoachMarkComponent,
    ToastHostComponent,
    KeyboardAccessoryComponent,
    AppGateComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  // Inyectado solo para forzar su instanciacion (y por tanto aplicar el
  // atributo data-theme) al arrancar la app, no porque se use aqui.
  private readonly themeService = inject(ThemeService);
  private readonly deepLinkService = inject(DeepLinkService);
  private readonly edgeSwipeBackService = inject(EdgeSwipeBackService);
  private readonly keyboardInsetService = inject(KeyboardInsetService);
  private readonly scrollTopService = inject(ScrollTopService);
  private readonly appGate = inject(AppGateService);

  constructor() {
    this.deepLinkService.init();
    this.edgeSwipeBackService.init();
    this.keyboardInsetService.init();
    this.scrollTopService.init();
    this.appGate.init();
  }
}
