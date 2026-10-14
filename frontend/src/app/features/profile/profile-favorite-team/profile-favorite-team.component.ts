import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { TeamFlagComponent } from '../../../shared/ui/team-flag/team-flag.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ProfileFavoriteTeamFacade } from './profile-favorite-team.facade';

/** Elegir (o quitar) el equipo favorito: su bandera sale en el perfil, tambien para quien lo visite. */
@Component({
  selector: 'app-profile-favorite-team',
  standalone: true,
  imports: [SpinnerComponent, TeamFlagComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [ProfileFavoriteTeamFacade],
  templateUrl: './profile-favorite-team.component.html',
  styleUrl: './profile-favorite-team.component.scss',
})
export class ProfileFavoriteTeamComponent implements OnInit {
  readonly page = inject(ProfileFavoriteTeamFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
