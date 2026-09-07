import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';

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
        padding-bottom: 64px;
      }
    `,
  ],
})
export class ShellComponent {}
