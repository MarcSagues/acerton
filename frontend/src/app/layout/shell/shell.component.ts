import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { AdsService } from '../../core/services/ads.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <div class="shell">
      <div class="shell-content">
        <router-outlet></router-outlet>
      </div>
      <app-bottom-nav></app-bottom-nav>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--bg);
      }
      .shell-content {
        flex: 1;
        padding-top: env(safe-area-inset-top);
        padding-bottom: calc(76px + env(safe-area-inset-bottom));
      }
    `,
  ],
})
export class ShellComponent implements OnInit {
  private readonly ads = inject(AdsService);

  ngOnInit(): void {
    this.ads.showBanner();
  }
}
