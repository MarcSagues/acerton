import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { GroupsService } from '../../../core/services/groups.service';
import { PublicGroupsService } from '../../../core/services/public-groups.service';
import { PublicGroupPreview } from '../../../core/models/public-group.model';

/**
 * Vista previa antes de unirse por link o codigo de invitacion: en vez de
 * unirse directamente al aterrizar (como antes), muestra el grupo real
 * (privado o publico) y deja decidir Unirme/Cancelar. Ver
 * GroupJoinCodeFacade.joinGroup, que trae aqui el codigo introducido a mano.
 */
@Injectable()
export class GroupJoinFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
  private readonly publicGroupsService = inject(PublicGroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly authService = inject(AuthService);

  private inviteCode = '';

  readonly loading = signal(true);
  readonly joining = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly preview = signal<PublicGroupPreview | null>(null);

  init(): void {
    const inviteCode = this.route.snapshot.paramMap.get('inviteCode');
    if (!inviteCode) {
      this.loading.set(false);
      this.errorMessage.set('Link de invitación inválido');
      return;
    }
    this.inviteCode = inviteCode;
    this.publicGroupsService.previewByInviteCode(inviteCode).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.message ?? 'No se pudo procesar la invitación');
        this.loading.set(false);
      },
    });
  }

  confirmJoin(): void {
    if (this.joining()) return;
    this.joining.set(true);
    this.groupsService.joinByInviteCode(this.inviteCode).subscribe({
      next: (group) => {
        this.joining.set(false);
        this.activeGroupService.setActive(group.id);
        // Primer grupo del usuario (tutorial aun no visto): se aterriza en
        // Tabla para que arranque ahi, igual que al crear o unirse por
        // codigo. Ya onboardeado, se respeta el destino habitual del enlace
        // de invitacion (Jornada).
        const target = this.authService.currentUser()?.tutorialCompleted ? ['/matchday'] : ['/rankings'];
        this.router.navigate(target);
      },
      error: (error: HttpErrorResponse) => {
        this.joining.set(false);
        this.errorMessage.set(error.error?.message ?? 'No se pudo unir al grupo');
      },
    });
  }

  /** Ya era miembro (link reabierto): ir directo al grupo sin volver a unirse. */
  goToGroup(): void {
    const preview = this.preview();
    if (preview) this.activeGroupService.setActive(preview.id);
    this.router.navigate(['/matchday']);
  }

  goToGroups(): void {
    this.router.navigate(['/groups']);
  }
}
