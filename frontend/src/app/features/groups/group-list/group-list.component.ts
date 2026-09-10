import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { Group, ScoringMode } from '../../../core/models/group.model';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss',
})
export class GroupListComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly groups = this.groupsService.myGroups;
  readonly loading = signal(true);

  readonly publicGroups = signal<Group[]>([]);
  readonly joiningGroupId = signal<string | null>(null);
  /** Solo los publicos a los que todavia no perteneces — unirte no tiene sentido si ya eres miembro. */
  readonly discoverableGroups = computed(() => {
    const myIds = new Set(this.groups().map((g) => g.id));
    return this.publicGroups().filter((g) => !myIds.has(g.id));
  });

  readonly showComebackDetail = signal(false);

  readonly showCreateSheet = signal(false);
  readonly showJoinSheet = signal(false);
  readonly formLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    isPublic: [false],
    scoringMode: ['ONE_X_TWO' as ScoringMode, [Validators.required]],
  });

  setScoringMode(mode: ScoringMode): void {
    this.createForm.patchValue({ scoringMode: mode });
  }

  setPrivacy(isPublic: boolean): void {
    this.createForm.patchValue({ isPublic });
  }

  readonly joinForm = this.fb.nonNullable.group({
    inviteCode: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    this.groupsService.loadMyGroups().subscribe({
      next: (groups) => {
        this.activeGroupService.setGroups(groups);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.groupsService.loadPublicGroups().subscribe((groups) => this.publicGroups.set(groups));
  }

  joinPublicGroup(groupId: string): void {
    if (this.joiningGroupId()) return;
    this.joiningGroupId.set(groupId);
    this.groupsService.joinPublic(groupId).subscribe({
      next: (group) => {
        this.joiningGroupId.set(null);
        this.goToGroup(group.id);
      },
      error: () => this.joiningGroupId.set(null),
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  openCreateSheet(): void {
    this.showCreateSheet.set(true);
    this.showJoinSheet.set(false);
    this.errorMessage.set(null);
    this.showComebackDetail.set(false);
  }

  openJoinSheet(): void {
    this.showJoinSheet.set(true);
    this.showCreateSheet.set(false);
    this.errorMessage.set(null);
  }

  closeSheets(): void {
    this.showCreateSheet.set(false);
    this.showJoinSheet.set(false);
  }

  goToGroup(groupId: string): void {
    this.activeGroupService.setActive(groupId);
    this.router.navigate(['/rankings']);
  }

  createGroup(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const value = this.createForm.getRawValue();
    this.groupsService
      .create({
        name: value.name,
        description: value.description || undefined,
        isPublic: value.isPublic,
        scoringMode: value.scoringMode,
      })
      .subscribe({
        next: (group) => {
          this.formLoading.set(false);
          this.closeSheets();
          this.activeGroupService.setActive(group.id);
          this.router.navigate(['/groups', group.id, 'settings']);
        },
        error: (error: HttpErrorResponse) => {
          this.formLoading.set(false);
          this.errorMessage.set(error.error?.message ?? 'No se pudo crear el grupo');
        },
      });
  }

  joinGroup(): void {
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const { inviteCode } = this.joinForm.getRawValue();
    this.groupsService.joinByInviteCode(inviteCode.trim().toUpperCase()).subscribe({
      next: (group) => {
        this.formLoading.set(false);
        this.closeSheets();
        this.goToGroup(group.id);
      },
      error: (error: HttpErrorResponse) => {
        this.formLoading.set(false);
        this.errorMessage.set(error.error?.message ?? 'Codigo de invitacion invalido');
      },
    });
  }
}
