import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicGroupsService } from '../../../core/services/public-groups.service';
import { GroupsService } from '../../../core/services/groups.service';
import { CompetitionsService } from '../../../core/services/competitions.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ScoringMode } from '../../../core/models/group.model';
import { PublicGroupPreview, PublicGroupSummary } from '../../../core/models/public-group.model';
import {
  EMPTY_PUBLIC_GROUP_FILTERS,
  PublicGroupFilters,
  hasActivePublicGroupFilters,
  publicGroupFiltersFromQueryParams,
  publicGroupFiltersToQueryParams,
} from './domain/public-group-filters';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export const SCORING_MODE_OPTIONS: { value: ScoringMode | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'ONE_X_TWO', label: 'Quiniela 1X2' },
  { value: 'EXACT_SCORE', label: 'Resultado exacto' },
];

@Injectable()
export class GroupExploreFacade {
  private readonly publicGroupsService = inject(PublicGroupsService);
  private readonly groupsService = inject(GroupsService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();

  readonly filters = signal<PublicGroupFilters>(EMPTY_PUBLIC_GROUP_FILTERS);
  readonly hasActiveFilters = computed(() => hasActivePublicGroupFilters(this.filters()));

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly items = signal<PublicGroupSummary[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly hasMore = computed(() => this.nextCursor() !== null);

  readonly catalog = this.competitionsService.catalog;

  readonly previewGroupId = signal<string | null>(null);
  readonly preview = signal<PublicGroupPreview | null>(null);
  readonly previewLoading = signal(false);
  readonly previewError = signal(false);

  readonly joiningGroupId = signal<string | null>(null);

  init(): void {
    if (this.competitionsService.catalog().length === 0) {
      this.competitionsService.loadCatalog().subscribe();
    }

    const params = this.route.snapshot.queryParamMap;
    this.filters.set(
      publicGroupFiltersFromQueryParams({ q: params.get('q'), modo: params.get('modo'), ligas: params.get('ligas') }),
    );

    this.searchInput$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.applyFilters({ ...this.filters(), q }));

    this.fetchFirstPage();
  }

  setSearchText(q: string): void {
    this.searchInput$.next(q);
  }

  setScoringMode(scoringMode: ScoringMode | null): void {
    this.applyFilters({ ...this.filters(), scoringMode });
  }

  toggleCompetition(competitionId: string): void {
    const current = this.filters().competitionIds;
    const competitionIds = current.includes(competitionId)
      ? current.filter((id) => id !== competitionId)
      : [...current, competitionId];
    this.applyFilters({ ...this.filters(), competitionIds });
  }

  removeFilter(kind: 'q' | 'scoringMode' | 'competitionId', competitionId?: string): void {
    const current = this.filters();
    if (kind === 'q') this.applyFilters({ ...current, q: '' });
    else if (kind === 'scoringMode') this.applyFilters({ ...current, scoringMode: null });
    else this.applyFilters({ ...current, competitionIds: current.competitionIds.filter((id) => id !== competitionId) });
  }

  clearFilters(): void {
    this.applyFilters(EMPTY_PUBLIC_GROUP_FILTERS);
  }

  competitionName(competitionId: string): string {
    return this.catalog().find((c) => c.id === competitionId)?.name ?? competitionId;
  }

  retry(): void {
    this.fetchFirstPage();
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.publicGroupsService.search({ ...this.searchParams(), cursor, limit: PAGE_SIZE }).subscribe({
      next: (page) => {
        this.items.update((current) => [...current, ...page.items]);
        this.nextCursor.set(page.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  openPreview(groupId: string): void {
    this.previewGroupId.set(groupId);
    this.previewLoading.set(true);
    this.previewError.set(false);
    this.preview.set(null);
    this.publicGroupsService.preview(groupId).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewError.set(true);
        this.previewLoading.set(false);
      },
    });
  }

  closePreview(): void {
    this.previewGroupId.set(null);
    this.preview.set(null);
    this.previewError.set(false);
  }

  join(groupId: string, onSuccess?: () => void): void {
    if (this.joiningGroupId()) return;
    this.joiningGroupId.set(groupId);
    this.groupsService.joinPublic(groupId).subscribe({
      next: (group) => {
        this.joiningGroupId.set(null);
        this.activeGroupService.setActive(group.id);
        onSuccess?.();
        this.router.navigate(['/matchday']);
      },
      error: (err) => {
        this.joiningGroupId.set(null);
        if (err?.status === 409) {
          this.toast.show('Ya eres miembro de este grupo');
        } else {
          this.toast.show('No se ha podido unir al grupo. Reintenta.');
        }
      },
    });
  }

  private applyFilters(filters: PublicGroupFilters): void {
    this.filters.set(filters);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: publicGroupFiltersToQueryParams(filters),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.fetchFirstPage();
  }

  private searchParams() {
    const filters = this.filters();
    return {
      q: filters.q || undefined,
      scoringMode: filters.scoringMode ?? undefined,
      competitionIds: filters.competitionIds.length > 0 ? filters.competitionIds : undefined,
    };
  }

  private fetchFirstPage(): void {
    this.loading.set(true);
    this.error.set(false);
    this.publicGroupsService.search({ ...this.searchParams(), limit: PAGE_SIZE }).subscribe({
      next: (page) => {
        this.items.set(page.items);
        this.nextCursor.set(page.nextCursor);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
