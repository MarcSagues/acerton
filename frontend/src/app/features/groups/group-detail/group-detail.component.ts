import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { GroupsService } from '../../../core/services/groups.service';
import { CompetitionsService } from '../../../core/services/competitions.service';
import { AuthService } from '../../../core/services/auth.service';
import { Group, GroupMember } from '../../../core/models/group.model';
import { Competition } from '../../../core/models/competition.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly groupsService = inject(GroupsService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly groupId = this.route.snapshot.paramMap.get('groupId')!;
  /** true durante los 2s posteriores a un copiado con exito: el boton muestra un tick y no se puede volver a pulsar. */
  readonly justCopiedInviteLink = signal(false);

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
  /** Toggles de guardado inmediato (comodin / privacidad): sin modo edicion, se aplican al toque. */
  readonly togglingRule = signal(false);

  readonly isAdmin = computed(() => {
    const userId = this.authService.currentUser()?.id;
    return this.members().some((m) => m.userId === userId && m.role === 'ADMIN');
  });

  readonly hasCompetitionChanges = computed(() => {
    const active = this.activeCompetitionIds();
    const selected = this.selectedCompetitionIds();
    return selected.size !== active.size || [...selected].some((id) => !active.has(id));
  });

  readonly newlySelectedCount = computed(() => {
    const active = this.activeCompetitionIds();
    return [...this.selectedCompetitionIds()].filter((id) => !active.has(id)).length;
  });

  readonly inviteLink = computed(() => {
    const group = this.group();
    return group ? `${window.location.origin}/groups/join/${group.inviteCode}` : '';
  });

  ngOnInit(): void {
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

  saveCompetitions(): void {
    const competitionIds = [...this.selectedCompetitionIds()];
    if (competitionIds.length === 0) {
      this.snackBar.open('Selecciona al menos una competicion', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Activar competiciones',
        message: `Vas a activar ${this.newlySelectedCount()} competicion(es) nueva(s). Una vez activada una liga no se podra desactivar despues, solo anadir mas. ¿Confirmas?`,
        confirmLabel: 'Activar',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.savingCompetitions.set(true);
      this.groupsService.updateCompetitions(this.groupId, competitionIds).subscribe({
        next: (group) => {
          this.group.set(group);
          this.activeCompetitionIds.set(new Set(competitionIds));
          this.savingCompetitions.set(false);
          this.snackBar.open('Competiciones actualizadas', 'Cerrar', { duration: 2500 });
        },
        error: (error: HttpErrorResponse) => {
          this.savingCompetitions.set(false);
          this.snackBar.open(error.error?.message ?? 'No se pudo guardar', 'Cerrar', { duration: 3000 });
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
    this.savingRules.set(true);
    this.groupsService
      .updateRules(this.groupId, { comebackPointsPerBonus: this.comebackPointsPerBonusInput() })
      .subscribe({
        next: (group) => {
          this.group.set(group);
          this.savingRules.set(false);
          this.editingRules.set(false);
          this.snackBar.open('Reglas actualizadas', 'Cerrar', { duration: 2500 });
        },
        error: (error: HttpErrorResponse) => {
          this.savingRules.set(false);
          this.snackBar.open(error.error?.message ?? 'No se pudo guardar', 'Cerrar', { duration: 3000 });
        },
      });
  }

  /** Comodin y privacidad se guardan al toque, sin pasar por el modo "Editar". */
  toggleComebackEnabled(): void {
    const group = this.group();
    if (!this.isAdmin() || !group || this.togglingRule()) {
      return;
    }
    this.applyToggle({ comebackEnabled: !group.comebackEnabled });
  }

  togglePrivacy(): void {
    const group = this.group();
    if (!this.isAdmin() || !group || this.togglingRule()) {
      return;
    }
    this.applyToggle({ isPublic: !group.isPublic });
  }

  private applyToggle(change: { comebackEnabled?: boolean; isPublic?: boolean }): void {
    this.togglingRule.set(true);
    this.groupsService.updateRules(this.groupId, change).subscribe({
      next: (group) => {
        this.group.set(group);
        this.togglingRule.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.togglingRule.set(false);
        this.snackBar.open(error.error?.message ?? 'No se pudo actualizar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  copyInviteLink(): void {
    if (this.justCopiedInviteLink()) return;
    // Solo se confirma si la copia funciona de verdad: sin fallback ni
    // comprobacion posterior del portapapeles, nos limitamos a reaccionar
    // al resultado de esta escritura concreta.
    navigator.clipboard
      ?.writeText(this.inviteLink())
      .then(() => {
        this.justCopiedInviteLink.set(true);
        setTimeout(() => this.justCopiedInviteLink.set(false), 2000);
      })
      .catch(() => undefined);
  }
}
