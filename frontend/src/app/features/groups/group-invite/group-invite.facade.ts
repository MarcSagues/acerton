import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Share } from '@capacitor/share';
import { GroupsService } from '../../../core/services/groups.service';
import { Group, GroupMember } from '../../../core/models/group.model';
import { environment } from '../../../../environments/environment';

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

  /** Siempre environment.appUrl, nunca window.location.origin: en la app
      nativa (Capacitor) el origin real es "capacitor://localhost", un
      enlace inservible en cuanto se comparte fuera de la app. */
  readonly inviteLink = computed(() => {
    const group = this.group();
    return group ? `${environment.appUrl}/groups/join/${group.inviteCode}` : '';
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

  /** Boton "Compartir enlace": abre el panel nativo de compartir (iOS/Android) o el del navegador si lo soporta, en vez de solo copiar al portapapeles como antes. */
  async shareLink(): Promise<void> {
    const group = this.group();
    if (!group) return;

    const { value: canShare } = await Share.canShare();
    if (!canShare) {
      // Sin soporte (navegador de escritorio sin Web Share API, por
      // ejemplo): el copiado al portapapeles sigue siendo la alternativa.
      this.copyLink();
      return;
    }
    try {
      await Share.share({
        title: 'Únete a mi grupo en Piqo',
        text: `Únete a ${group.name} en Piqo`,
        url: this.inviteLink(),
        dialogTitle: 'Compartir enlace de invitación',
      });
    } catch {
      // El usuario cierra el panel de compartir sin elegir nada: no es un
      // fallo real, no hace falta avisar de nada.
    }
  }
}
