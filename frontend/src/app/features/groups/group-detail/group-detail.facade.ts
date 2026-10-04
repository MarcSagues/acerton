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
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { Group, GroupMember } from '../../../core/models/group.model';
import { Competition } from '../../../core/models/competition.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { competitionTrophyId } from '../../../shared/utils/competition-trophy';
import { t } from '../../../core/i18n/translate';

/** Mismos limites que CreateGroupDto/UpdateGroupRulesDto en backend. */
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 60;

@Injectable()
export class GroupDetailFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly authService = inject(AuthService);
  private readonly activeGroupService = inject(ActiveGroupService);
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

  readonly savingRules = signal(false);
  /** Nombre en edicion (solo admins): se guarda con "Guardar cambios", igual que el resto de ajustes. */
  readonly nameInput = signal('');
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

  readonly nameError = computed(() => {
    const length = this.nameInput().trim().length;
    if (length < NAME_MIN_LENGTH) return t('groupDetail.nombreDebeTenerMenos', { NAME_MIN_LENGTH });
    if (length > NAME_MAX_LENGTH) return t('groupDetail.nombrePuedePasarCaracteres', { NAME_MAX_LENGTH });
    return null;
  });

  /** "Cambiado" aunque sea invalido (p.ej. vacio): asi el boton de guardar aparece y explica por que no deja. */
  readonly hasNameChanges = computed(() => {
    const group = this.group();
    return !!group && this.nameInput().trim() !== group.name;
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

  /** Un unico botón "Guardar cambios" cubre nombre, competiciones, reglas y los toggles: no hay un botón por sección. */
  readonly hasAnyChanges = computed(
    () => this.hasNameChanges() || this.hasCompetitionChanges() || this.hasRuleChanges() || this.hasToggleChanges(),
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
        this.nameInput.set(group.name);
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
      return { label: t('groupDetail.activa'), tone: 'success' };
    }
    if (this.selectedCompetitionIds().has(competition.id)) {
      return { label: t('groupDetail.anadira'), tone: 'accent' };
    }
    return this.isAdmin() ? { label: t('groupDetail.disponible'), tone: 'muted' } : { label: t('groupDetail.disponible'), tone: 'muted' };
  }

  roleLabel(member: GroupMember): string {
    if (this.isOwnerRow(member)) return t('groupDetail.creador');
    return member.role === 'ADMIN' ? t('groupDetail.admin') : t('groupDetail.miembro');
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

  /** Un unico punto de guardado para todo lo editable en esta pantalla (nombre + competiciones + reglas + toggles). */
  saveChanges(): void {
    const competitionsChanged = this.hasCompetitionChanges();
    const rulesChanged = this.hasRuleChanges() || this.hasToggleChanges() || this.hasNameChanges();
    if (!competitionsChanged && !rulesChanged) {
      return;
    }
    // Antes de confirmar/guardar nada: un nombre invalido no debe dejar el
    // resto de cambios pendientes guardados a medias.
    const nameError = this.hasNameChanges() ? this.nameError() : null;
    if (nameError) {
      this.toast.show(nameError);
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
      this.toast.show(t('groupDetail.seleccionaMenosCompeticion'));
      return;
    }

    this.confirm({
      title: t('groupDetail.activarCompeticiones'),
      message: t('groupDetail.confirmActivate', { count: this.newlySelectedCount() }),
      confirmLabel: t('notificationSettings.activar'),
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
            this.toast.show(t('groupDetail.cambiosGuardados'));
          }
        },
        error: (error: HttpErrorResponse) => {
          this.savingCompetitions.set(false);
          this.toast.show(error.error?.message ?? t('groupDetail.pudoGuardar'));
        },
      });
    });
  }

  saveRules(): void {
    const group = this.group();
    if (!group) {
      return;
    }
    const payload: { name?: string; comebackPointsPerBonus?: number; comebackEnabled?: boolean; isPublic?: boolean } =
      {};
    if (this.hasNameChanges()) {
      payload.name = this.nameInput().trim();
    }
    if (this.hasRuleChanges()) {
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
        this.nameInput.set(updated.name);
        // El selector de grupo de la barra superior lee de ActiveGroupService,
        // no del listado de GroupsService (que ya cambio el nombre en su tap).
        this.activeGroupService.setGroups(this.groupsService.myGroups());
        this.comebackPointsPerBonusInput.set(updated.comebackPointsPerBonus);
        this.selectedComebackEnabled.set(updated.comebackEnabled);
        this.selectedIsPublic.set(updated.isPublic);
        this.savingRules.set(false);
        this.toast.show(t('groupDetail.cambiosGuardados'));
      },
      error: (error: HttpErrorResponse) => {
        this.savingRules.set(false);
        this.toast.show(error.error?.message ?? t('groupDetail.pudoGuardar'));
      },
    });
  }

  updateNameInput(value: string): void {
    if (!this.isAdmin()) {
      return;
    }
    this.nameInput.set(value);
  }

  updateComebackPointsPerBonusInput(value: string): void {
    if (!this.isAdmin()) {
      return;
    }
    const parsed = Number(value);
    this.comebackPointsPerBonusInput.set(Number.isFinite(parsed) ? parsed : 0);
  }

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
      actions.push({ label: t('groupDetail.hacerAdministrador'), run: () => this.promoteMember(member) });
    }
    if (this.canDemote(member)) {
      actions.push({ label: t('groupDetail.quitarAdministrador'), run: () => this.demoteMember(member) });
    }
    if (this.canTransferTo(member)) {
      actions.push({ label: t('groupDetail.hacerPropietario'), run: () => this.transferOwnershipPrompt(member) });
    }
    if (this.canKick(member)) {
      actions.push({ label: t('groupDetail.expulsarGrupo'), danger: true, run: () => this.kickMemberPrompt(member) });
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
        this.toast.show(error.error?.message ?? t('groupDetail.pudoCambiarRol'));
      },
    });
  }

  kickMemberPrompt(member: GroupMember): void {
    if (this.savingMembership()) return;
    this.confirm({
      title: t('groupDetail.expulsarGrupo'),
      message: t('groupDetail.seguroQuieresExpulsarEste', { name: member.user.name }),
      confirmLabel: t('groupDetail.expulsar'),
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
          this.toast.show(error.error?.message ?? t('groupDetail.pudoExpulsar'));
        },
      });
    });
  }

  transferOwnershipPrompt(member: GroupMember): void {
    if (this.savingMembership()) return;
    this.confirm({
      title: t('groupDetail.transferirPropiedad'),
      message: t('groupDetail.transferirPropiedadGrupoPasaras', { name: member.user.name }),
      confirmLabel: t('groupDetail.transferir'),
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
          this.toast.show(t('groupDetail.propiedadTransferida'));
        },
        error: (error: HttpErrorResponse) => {
          this.savingMembership.set(false);
          this.toast.show(error.error?.message ?? t('groupDetail.pudoTransferirPropiedad'));
        },
      });
    });
  }

  leaveGroupPrompt(): void {
    if (this.savingMembership()) return;
    if (this.isOwner()) {
      this.toast.show(t('groupDetail.transfierePropiedadEliminaGrupo2'));
      return;
    }
    this.confirm({
      title: t('groupDetail.salirGrupo'),
      message: t('groupDetail.seguroQuieresSalirEste'),
      confirmLabel: t('groupDetail.salir'),
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.savingMembership.set(true);
      this.groupsService.leaveGroup(this.groupId).subscribe({
        next: () => this.router.navigate(['/groups']),
        error: (error: HttpErrorResponse) => {
          this.savingMembership.set(false);
          this.toast.show(error.error?.message ?? t('groupDetail.pudoSalirGrupo'));
        },
      });
    });
  }

  deleteGroupPrompt(): void {
    if (this.savingMembership()) return;
    this.confirm({
      title: t('groupDetail.eliminarGrupo'),
      message:
        t('groupDetail.grupoDesapareceraTodosListados'),
      confirmLabel: t('groupDetail.eliminar'),
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.savingMembership.set(true);
      this.groupsService.deleteGroup(this.groupId).subscribe({
        next: () => this.router.navigate(['/groups']),
        error: (error: HttpErrorResponse) => {
          this.savingMembership.set(false);
          this.toast.show(error.error?.message ?? t('groupDetail.pudoEliminarGrupo'));
        },
      });
    });
  }
}
