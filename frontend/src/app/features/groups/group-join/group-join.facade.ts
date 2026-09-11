import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { GroupsService } from '../../../core/services/groups.service';

@Injectable()
export class GroupJoinFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly errorMessage = signal<string | null>(null);

  init(): void {
    const inviteCode = this.route.snapshot.paramMap.get('inviteCode');
    if (!inviteCode) {
      this.errorMessage.set('Link de invitacion invalido');
      return;
    }

    this.groupsService.joinByInviteCode(inviteCode).subscribe({
      next: (group) => {
        this.activeGroupService.setActive(group.id);
        this.router.navigate(['/matchday']);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.message ?? 'No se pudo procesar la invitacion');
      },
    });
  }

  goToGroups(): void {
    this.router.navigate(['/groups']);
  }
}
