import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { NotificationPromptComponent } from './notification-prompt.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent, NotificationPromptComponent],
  template: `
    <div class="shell">
      <app-notification-prompt></app-notification-prompt>
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
        padding-bottom: 72px;
      }
    `,
  ],
})
export class ShellComponent {}
