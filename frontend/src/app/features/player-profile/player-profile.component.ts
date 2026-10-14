import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../shared/ui/spinner/spinner.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { TeamFlagComponent } from '../../shared/ui/team-flag/team-flag.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PlayerProfileFacade } from './player-profile.facade';

/** Perfil general de un jugador: lo que se abre al pulsar a alguien en el Quiz, en Tabla, etc. */
@Component({
  selector: 'app-player-profile',
  standalone: true,
  imports: [DatePipe, RouterLink, SpinnerComponent, AvatarComponent, TeamFlagComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [PlayerProfileFacade],
  templateUrl: './player-profile.component.html',
  styleUrl: './player-profile.component.scss',
})
export class PlayerProfileComponent implements OnInit {
  readonly page = inject(PlayerProfileFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
