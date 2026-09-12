import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GroupsService } from '../../../core/services/groups.service';
import { Group, GroupMember } from '../../../core/models/group.model';

@Injectable()
export class GroupInviteFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly groupsService = inject(GroupsService);

  readonly groupId = this.route.snapshot.paramMap.get('groupId')!;
  readonly loading = signal(true);
  readonly group = signal<Group | null>(null);
  readonly members = signal<GroupMember[]>([]);
  /** true durante los 2s posteriores a un copiado con exito: el boton muestra un tick y no se puede volver a pulsar. */
  readonly justCopiedCode = signal(false);
  readonly justCopiedLink = signal(false);

  readonly inviteLink = computed(() => {
    const group = this.group();
    return group ? `${window.location.origin}/groups/join/${group.inviteCode}` : '';
  });

  init(): void {
    forkJoin({
      group: this.groupsService.getById(this.groupId),
      members: this.groupsService.listMembers(this.groupId),
    }).subscribe({
      next: ({ group, members }) => {
        this.group.set(group);
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  copyCode(): void {
    if (this.justCopiedCode()) return;
    const group = this.group();
    if (!group) return;
    navigator.clipboard
      ?.writeText(group.inviteCode)
      .then(() => {
        this.justCopiedCode.set(true);
        setTimeout(() => this.justCopiedCode.set(false), 2000);
      })
      .catch(() => undefined);
  }

  copyLink(): void {
    if (this.justCopiedLink()) return;
    navigator.clipboard
      ?.writeText(this.inviteLink())
      .then(() => {
        this.justCopiedLink.set(true);
        setTimeout(() => this.justCopiedLink.set(false), 2000);
      })
      .catch(() => undefined);
  }
}
