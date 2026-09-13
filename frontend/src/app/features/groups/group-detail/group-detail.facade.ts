import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { MemberActionsSheetComponent, MemberActionsSheetData } from './member-actions-sheet.component';
import { GroupsService } from '../../../core/services/groups.service';
import { CompetitionsService } from '../../../core/services/competitions.service';
import { AuthService } from '../../../core/services/auth.service';
import { Group, GroupMember } from '../../../core/models/group.model';
import { Competition } from '../../../core/models/competition.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { competitionTrophyId } from '../../../shared/utils/competition-trophy';

@Injectable()
export class GroupDetailFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(PiqoDialogService);
  private readonly sheet = inject(BottomSheetService);

  private confirm(data: ConfirmDialogData) {
    return this.dialog.open<ConfirmDialogComponent, boolean, ConfirmDialogData>(ConfirmDialogComponent, { data })
      .closed;
  }

  readonly groupId = this.route.snapshot.paramMap.get('groupId')!;

  readonly loading = signal(true);
  readonly group = signal<Group | null>(null);
  readonly members = signal<GroupMember[]>([]);
  readonly catalog = signal<Competition[]>([]);
  /** Competiciones ya activas en el servidor: no se pueden desmarcar, solo anadir mas encima. */
  readonly activeCompetitionIds = signal<Set<string>>(new Set());
  readonly selectedCompetitionIds = signal<Set<string>>(new Set());
  readonly savingCompetitions = signal(false);

  readonly editingRules = signal(false);
  readonly savingRules = signal(false);
  readonly comebackPointsPerBonusInput = signal(10);
  /** Comodin y privacidad: el toque solo cambia el valor pendiente, se guardan con "Guardar cambios". */
  readonly selectedComebackEnabled = signal(false);
  readonly selectedIsPublic = signal(false);

  readonly myUserId = computed(() => this.authService.currentUser()?.id ?? null);

  readonly isAdmin = computed(() => {
    const userId = this.myUserId();
    return this.members().some((m) => m.userId === userId && m.role === 'ADMIN');
  });

  /** El creador tiene control total: nombrar/quitar admins, transferir propiedad, eliminar el grupo. */
  readonly isOwner = computed(() => {
    const group = this.group();
    return !!group && group.ownerId === this.myUserId();
  });

  readonly savingMembership = signal(false);

  /** true durante los 2s posteriores a un copiado con exito. */
  readonly justCopiedCode = signal(false);

  readonly hasCompetitionChanges = computed(() => {
    const active = this.activeCompetitionIds();
    const selected = this.selectedCompetitionIds();
    return selected.size !== active.size || [...selected].some((id) => !active.has(id));
  });

  readonly newlySelectedCount = computed(() => {
    const active = this.activeCompetitionIds();
    return [...this.selectedCompetitionIds()].filter((id) => !active.has(id)).length;
  });

  readonly hasRuleChanges = computed(() => {
    const value = this.comebackPointsPerBonusInput();
    const current = this.group()?.comebackPointsPerBonus;
    return value >= 1 && value <= 50 && value !== current;
  });

  readonly hasToggleChanges = computed(() => {
    const group = this.group();
    if (!group) {
      return false;
    }
    return this.selectedComebackEnabled() !== group.comebackEnabled || this.selectedIsPublic() !== group.isPublic;
  });

  /** Un unico botón "Guardar cambios" cubre competiciones, reglas y los toggles: no hay un botón por sección. */
  readonly hasAnyChanges = computed(
    () =>
      this.hasCompetitionChanges() || (this.editingRules() && this.hasRuleChanges()) || this.hasToggleChanges(),
  );

  readonly saving = computed(() => this.savingCompetitions() || this.savingRules());

  init(): void {
    forkJoin({
      group: this.groupsService.getById(this.groupId),
      members: this.groupsService.listMembers(this.groupId),
      catalog: this.competitionsService.loadCatalog(),
    }).subscribe({
      next: ({ group, members }) => {
        this.group.set(group);
        this.members.set(members);
        this.catalog.set(this.competitionsService.catalog());
        this.comebackPointsPerBonusInput.set(group.comebackPointsPerBonus);
        this.selectedComebackEnabled.set(group.comebackEnabled);
        this.selectedIsPublic.set(group.isPublic);
        const active = new Set(
          (group.groupCompetitions ?? []).filter((gc) => gc.isActive).map((gc) => gc.competitionId),
        );
        this.activeCompetitionIds.set(active);
        this.selectedCompetitionIds.set(new Set(active));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isLocked(competitionId: string): boolean {
    return this.activeCompetitionIds().has(competitionId);
  }

  trophyId(competition: Competition): string | null {
    return competitionTrophyId(competition.code);
  }

  competitionStatus(competition: Competition): { label: string; tone: 'success' | 'accent' | 'muted' } {
    if (this.isLocked(competition.id)) {
      return { label: 'Activa', tone: 'success' };
    }
    if (this.selectedCompetitionIds().has(competition.id)) {
      return { label: 'Se añadirá', tone: 'accent' };
    }
    return this.isAdmin() ? { label: 'Disponible', tone: 'muted' } : { label: 'No disponible', tone: 'muted' };
  }

  roleLabel(member: GroupMember): string {
    if (this.isOwnerRow(member)) return 'Creador';
    return member.role === 'ADMIN' ? 'Admin' : 'Miembro';
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

  goToInvite(): void {
    this.router.navigate(['/groups', this.groupId, 'invite']);
  }

  toggleCompetition(competitionId: string): void {
    if (!this.isAdmin() || this.isLocked(competitionId)) {
      return;
    }
    this.selectedCompetitionIds.update((current) => {
      const next = new Set(current);
      if (next.has(competitionId)) {
        next.delete(competitionId);
      } else {
        next.add(competitionId);
      }
      return next;
    });
  }

  /** Un unico punto de guardado para todo lo editable en esta pantalla (competiciones + reglas + toggles). */
  saveChanges(): void {
    const competitionsChanged = this.hasCompetitionChanges();
    const rulesChanged = (this.editingRules() && this.hasRuleChanges()) || this.hasToggleChanges();
    if (!competitionsChanged && !rulesChanged) {
      return;
    }
    if (!competitionsChanged) {
      this.saveRules();
      return;
    }
    this.saveCompetitions(rulesChanged);
  }

  private saveCompetitions(alsoSaveRules: boolean): void {
    const competitionIds = [...this.selectedCompetitionIds()];
    if (competitionIds.length === 0) {
      this.toast.show('Selecciona al menos una competición');
      return;
    }

    this.confirm({
      title: 'Activar competiciones',
      message: `Vas a activar ${this.newlySelectedCount()} competición(es) nueva(s). Una vez activada una liga no se podrá desactivar después, solo añadir más. ¿Confirmas?`,
      confirmLabel: 'Activar',
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.savingCompetitions.set(true);
      this.groupsService.updateCompetitions(this.groupId, competitionIds).subscribe({
        next: (group) => {
          this.group.set(group);
          this.activeCompetitionIds.set(new Set(competitionIds));
          this.savingCompetitions.set(false);
          if (alsoSaveRules) {
            this.saveRules();
          } else {
            this.toast.show('Cambios guardados');
          }
        },
        error: (error: HttpErrorResponse) => {
          this.savingCompetitions.set(false);
          this.toast.show(error.error?.message ?? 'No se pudo guardar');
        },
      });
    });
  }

  startEditingRules(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.editingRules.set(true);
  }

  cancelEditingRules(): void {
    const group = this.group();
    if (group) {
      this.comebackPointsPerBonusInput.set(group.comebackPointsPerBonus);
    }
    this.editingRules.set(false);
  }

  saveRules(): void {
    const group = this.group();
    if (!group) {
      return;
    }
    const payload: { comebackPointsPerBonus?: number; comebackEnabled?: boolean; isPublic?: boolean } = {};
    if (this.editingRules() && this.hasRuleChanges()) {
      payload.comebackPointsPerBonus = this.comebackPointsPerBonusInput();
    }
    if (this.selectedComebackEnabled() !== group.comebackEnabled) {
      payload.comebackEnabled = this.selectedComebackEnabled();
    }
    if (this.selectedIsPublic() !== group.isPublic) {
      payload.isPublic = this.selectedIsPublic();
    }
    if (Object.keys(payload).length === 0) {
      return;
    }

    this.savingRules.set(true);
    this.groupsService.updateRules(this.groupId, payload).subscribe({
      next: (updated) => {
        this.group.set(updated);
        this.selectedComebackEnabled.set(updated.comebackEnabled);
        this.selectedIsPublic.set(updated.isPublic);
        this.savingRules.set(false);
        this.editingRules.set(false);
        this.toast.show('Cambios guardados');
      },
      error: (error: HttpErrorResponse) => {
        this.savingRules.set(false);
        this.toast.show(error.error?.message ?? 'No se pudo guardar');
      },
    });
  }

  /** Comodin y privacidad: solo cambian el valor pendiente, se guardan con "Guardar cambios". */
  toggleComebackEnabled(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.selectedComebackEnabled.update((value) => !value);
  }

  togglePrivacy(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.selectedIsPublic.update((value) => !value);
  }

  isOwnerRow(member: GroupMember): boolean {
    return member.userId === this.group()?.ownerId;
  }

  /** Solo el creador puede nombrar/quitar administradores o transferir la propiedad. */
  canPromote(member: GroupMember): boolean {
    return this.isOwner() && member.role === 'MEMBER' && !this.isOwnerRow(member);
  }

  canDemote(member: GroupMember): boolean {
    return this.isOwner() && member.role === 'ADMIN' && !this.isOwnerRow(member);
  }

  canTransferTo(member: GroupMember): boolean {
    return this.isOwner() && !this.isOwnerRow(member);
  }

  /** Ni un admin ni el propio creador pueden expulsar a otro admin o al creador (hay que quitarle antes el rol). */
  canKick(member: GroupMember): boolean {
    return this.isAdmin() && member.role === 'MEMBER' && !this.isOwnerRow(member);
  }

  hasMemberActions(member: GroupMember): boolean {
    return (
      member.userId !== this.myUserId() &&
      (this.canPromote(member) || this.canDemote(member) || this.canTransferTo(member) || this.canKick(member))
    );
  }

  openMemberActions(member: GroupMember): void {
    const actions: MemberActionsSheetData['actions'] = [];
    if (this.canPromote(member)) {
      actions.push({ label: 'Hacer administrador', run: () => this.promoteMember(member) });
    }
    if (this.canDemote(member)) {
      actions.push({ label: 'Quitar administrador', run: () => this.demoteMember(member) });
    }
    if (this.canTransferTo(member)) {
      actions.push({ label: 'Hacer propietario', run: () => this.transferOwnershipPrompt(member) });
    }
    if (this.canKick(member)) {
      actions.push({ label: 'Expulsar del grupo', danger: true, run: () => this.kickMemberPrompt(member) });
    }
    if (actions.length === 0) return;
    this.sheet.open<MemberActionsSheetComponent, void, MemberActionsSheetData>(MemberActionsSheetComponent, {
      data: { memberName: member.user.name, actions },
    });
  }

  promoteMember(member: GroupMember): void {
    this.setMemberRole(member, 'ADMIN');
  }

  demoteMember(member: GroupMember): void {
    this.setMemberRole(member, 'MEMBER');
  }

  private setMemberRole(member: GroupMember, role: 'ADMIN' | 'MEMBER'): void {
    if (this.savingMembership()) return;
    this.savingMembership.set(true);
    this.groupsService.updateMemberRole(this.groupId, member.userId, role).subscribe({
      next: (members) => {
        this.members.set(members);
        this.savingMembership.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.savingMembership.set(false);
        this.toast.show(error.error?.message ?? 'No se pudo cambiar el rol');
      },
    });
  }

  kickMemberPrompt(member: GroupMember): void {
    if (this.savingMembership()) return;
    this.confirm({
      title: 'Expulsar del grupo',
      message: `¿Seguro que quieres expulsar a ${member.user.name} de este grupo? Sus pronósticos y puntos ya conseguidos se conservan.`,
      confirmLabel: 'Expulsar',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.savingMembership.set(true);
      this.groupsService.kickMember(this.groupId, member.userId).subscribe({
        next: () => {
          this.members.update((members) => members.filter((m) => m.userId !== member.userId));
          this.savingMembership.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.savingMembership.set(false);
          this.toast.show(error.error?.message ?? 'No se pudo expulsar');
        },
      });
    });
  }

  transferOwnershipPrompt(member: GroupMember): void {
    if (this.savingMembership()) return;
    this.confirm({
      title: 'Transferir propiedad',
      message: `¿Transferir la propiedad del grupo a ${member.user.name}? Pasarás a ser administrador y ya no podrás nombrar o quitar administradores, transferir la propiedad ni eliminar el grupo.`,
      confirmLabel: 'Transferir',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.savingMembership.set(true);
      this.groupsService.transferOwnership(this.groupId, member.userId).subscribe({
        next: (group) => {
          this.group.set(group);
          this.members.update((members) =>
            members.map((m) => (m.userId === member.userId ? { ...m, role: 'ADMIN' } : m)),
          );
          this.savingMembership.set(false);
          this.toast.show('Propiedad transferida');
        },
        error: (error: HttpErrorResponse) => {
          this.savingMembership.set(false);
          this.toast.show(error.error?.message ?? 'No se pudo transferir la propiedad');
        },
      });
    });
  }

  leaveGroupPrompt(): void {
    if (this.savingMembership()) return;
    if (this.isOwner()) {
      this.toast.show('Transfiere la propiedad o elimina el grupo antes de salir');
      return;
    }
    this.confirm({
      title: 'Salir del grupo',
      message: '¿Seguro que quieres salir de este grupo? Podrás volver a entrar con el link de invitación.',
      confirmLabel: 'Salir',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.savingMembership.set(true);
      this.groupsService.leaveGroup(this.groupId).subscribe({
        next: () => this.router.navigate(['/groups']),
        error: (error: HttpErrorResponse) => {
          this.savingMembership.set(false);
          this.toast.show(error.error?.message ?? 'No se pudo salir del grupo');
        },
      });
    });
  }

  deleteGroupPrompt(): void {
    if (this.savingMembership()) return;
    this.confirm({
      title: 'Eliminar grupo',
      message:
        'El grupo desaparecerá de todos los listados y nadie podrá seguir jugando en él. El historial y los trofeos ya conseguidos se conservan. Esta acción no se puede deshacer desde la app.',
      confirmLabel: 'Eliminar',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.savingMembership.set(true);
      this.groupsService.deleteGroup(this.groupId).subscribe({
        next: () => this.router.navigate(['/groups']),
        error: (error: HttpErrorResponse) => {
          this.savingMembership.set(false);
          this.toast.show(error.error?.message ?? 'No se pudo eliminar el grupo');
        },
      });
    });
  }
}
