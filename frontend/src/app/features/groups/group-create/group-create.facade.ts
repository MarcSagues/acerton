import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { CompetitionsService } from '../../../core/services/competitions.service';
import { Competition } from '../../../core/models/competition.model';
import { ScoringMode } from '../../../core/models/group.model';
import { competitionTrophyId } from '../../../shared/utils/competition-trophy';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { InfoDialogComponent, InfoDialogData } from '../../../shared/info-dialog/info-dialog.component';

@Injectable()
export class GroupCreateFacade {
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly authService = inject(AuthService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dialog = inject(PiqoDialogService);

  readonly catalog = this.competitionsService.catalog;
  readonly formLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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

  trophyId(competition: Competition): string | null {
    return competitionTrophyId(competition.code);
  }

  showComebackDetail(): void {
    this.dialog.open<InfoDialogComponent, void, InfoDialogData>(InfoDialogComponent, {
      data: {
        title: '¿Cómo funciona el comodín?',
        message:
          'Cada partido se puede jugar con doble oportunidad (1X, X2 o 12) en vez de un pronóstico normal. Los usos disponibles se recalculan cada semana según tu diferencia de puntos con quien vaya primero en el grupo. El admin puede desactivarlo o ajustarlo después, desde los ajustes.',
      },
    });
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
          // Primer grupo del usuario (tutorial aun no visto): se aterriza en
          // Tabla para que el tutorial arranque ahi, como al unirse por
          // codigo/enlace. Ya onboardeado, va a Ajustes a por el codigo de
          // invitacion recien creado.
          const target = this.authService.currentUser()?.tutorialCompleted
            ? ['/groups', group.id, 'settings']
            : ['/rankings'];
          this.router.navigate(target);
        },
        error: (error: HttpErrorResponse) => {
          this.formLoading.set(false);
          this.errorMessage.set(error.error?.message ?? 'No se pudo crear el grupo');
        },
      });
  }
}
