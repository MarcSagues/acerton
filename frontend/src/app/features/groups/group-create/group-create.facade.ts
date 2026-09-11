import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { CompetitionsService } from '../../../core/services/competitions.service';
import { ScoringMode } from '../../../core/models/group.model';

@Injectable()
export class GroupCreateFacade {
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly catalog = this.competitionsService.catalog;
  readonly formLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showComebackDetail = signal(false);

  /** Elegir al menos una liga es un paso obligatorio antes de poder tocar el resto del formulario. */
  readonly step = signal<'competitions' | 'details'>('competitions');
  readonly selectedCompetitionIds = signal<Set<string>>(new Set());

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    isPublic: [false],
    scoringMode: ['ONE_X_TWO' as ScoringMode, [Validators.required]],
  });

  init(): void {
    this.competitionsService.loadCatalog().subscribe();
  }

  setScoringMode(mode: ScoringMode): void {
    this.form.patchValue({ scoringMode: mode });
  }

  setPrivacy(isPublic: boolean): void {
    this.form.patchValue({ isPublic });
  }

  toggleCompetition(competitionId: string): void {
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

  goToDetails(): void {
    if (this.selectedCompetitionIds().size === 0) return;
    this.step.set('details');
  }

  backToCompetitions(): void {
    this.step.set('competitions');
  }

  goBack(): void {
    if (this.step() === 'details') {
      this.backToCompetitions();
    } else {
      this.router.navigate(['/groups']);
    }
  }

  createGroup(): void {
    if (this.form.invalid || this.selectedCompetitionIds().size === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const value = this.form.getRawValue();
    this.groupsService
      .create({
        name: value.name,
        description: value.description || undefined,
        isPublic: value.isPublic,
        scoringMode: value.scoringMode,
        competitionIds: [...this.selectedCompetitionIds()],
      })
      .subscribe({
        next: (group) => {
          this.formLoading.set(false);
          this.activeGroupService.setActive(group.id);
          this.router.navigate(['/groups', group.id, 'settings']);
        },
        error: (error: HttpErrorResponse) => {
          this.formLoading.set(false);
          this.errorMessage.set(error.error?.message ?? 'No se pudo crear el grupo');
        },
      });
  }
}
