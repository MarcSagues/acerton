import {
  EMPTY_PUBLIC_GROUP_FILTERS,
  hasActivePublicGroupFilters,
  publicGroupFiltersFromQueryParams,
  publicGroupFiltersToQueryParams,
} from './public-group-filters';

describe('public group filters', () => {
  it('reports no active filters for the empty state', () => {
    expect(hasActivePublicGroupFilters(EMPTY_PUBLIC_GROUP_FILTERS)).toBe(false);
  });

  it('reports active filters when any field is set', () => {
    expect(hasActivePublicGroupFilters({ q: 'liga', scoringMode: null, competitionIds: [] })).toBe(true);
    expect(hasActivePublicGroupFilters({ q: '', scoringMode: 'EXACT_SCORE', competitionIds: [] })).toBe(true);
    expect(hasActivePublicGroupFilters({ q: '', scoringMode: null, competitionIds: ['c1'] })).toBe(true);
  });

  it('ignores whitespace-only search text', () => {
    expect(hasActivePublicGroupFilters({ q: '   ', scoringMode: null, competitionIds: [] })).toBe(false);
  });

  it('round-trips through query params', () => {
    const filters = { q: 'amigos', scoringMode: 'EXACT_SCORE' as const, competitionIds: ['c1', 'c2'] };
    const params = publicGroupFiltersToQueryParams(filters);
    expect(params).toEqual({ q: 'amigos', modo: 'EXACT_SCORE', ligas: 'c1,c2' });
    expect(publicGroupFiltersFromQueryParams(params)).toEqual(filters);
  });

  it('produces null params (not empty strings) for unset filters, to keep the URL clean', () => {
    const params = publicGroupFiltersToQueryParams(EMPTY_PUBLIC_GROUP_FILTERS);
    expect(params).toEqual({ q: null, modo: null, ligas: null });
  });

  it('ignores an invalid scoringMode value from the URL instead of throwing', () => {
    const filters = publicGroupFiltersFromQueryParams({ modo: 'algo-invalido' });
    expect(filters.scoringMode).toBeNull();
  });
});
