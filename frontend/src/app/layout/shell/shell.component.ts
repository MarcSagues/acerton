import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { TopBarComponent } from '../top-bar/top-bar.component';
import { ShellFacade } from './shell.facade';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent, TopBarComponent],
  providers: [ShellFacade],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private readonly page = inject(ShellFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
