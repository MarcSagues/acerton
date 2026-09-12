import { ScoringMode } from '../../../../core/models/group.model';

export interface PublicGroupFilters {
  q: string;
  scoringMode: ScoringMode | null;
  competitionIds: string[];
}

export const EMPTY_PUBLIC_GROUP_FILTERS: PublicGroupFilters = {
  q: '',
  scoringMode: null,
  competitionIds: [],
};

export function hasActivePublicGroupFilters(filters: PublicGroupFilters): boolean {
  return filters.q.trim().length > 0 || filters.scoringMode !== null || filters.competitionIds.length > 0;
}

/**
 * De filtros a parametros de URL (para conservarlos al volver de la vista
 * previa) y viceversa. Solo se escriben las claves con valor: mantiene la
 * URL limpia cuando no hay filtros activos.
 */
export function publicGroupFiltersToQueryParams(filters: PublicGroupFilters): Record<string, string | null> {
  return {
    q: filters.q.trim() || null,
    modo: filters.scoringMode ?? null,
    ligas: filters.competitionIds.length > 0 ? filters.competitionIds.join(',') : null,
  };
}

export function publicGroupFiltersFromQueryParams(params: {
  q?: string | null;
  modo?: string | null;
  ligas?: string | null;
}): PublicGroupFilters {
  return {
    q: params.q ?? '',
    scoringMode: params.modo === 'ONE_X_TWO' || params.modo === 'EXACT_SCORE' ? params.modo : null,
    competitionIds: params.ligas ? params.ligas.split(',').filter(Boolean) : [],
  };
}
