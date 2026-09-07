export interface ProviderTeam {
  name: string;
  logoUrl: string | null;
}

export type ProviderFixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export interface ProviderFixture {
  fixtureId: number;
  round: string;
  kickoff: Date;
  homeTeam: ProviderTeam;
  awayTeam: ProviderTeam;
  status: ProviderFixtureStatus;
  homeGoals: number | null;
  awayGoals: number | null;
}

/**
 * Puerto hacia el proveedor externo de datos de futbol. La implementacion
 * concreta (actualmente FootballDataOrgProvider, football-data.org) vive
 * detras de este contrato para poder cambiar de proveedor sin tocar el
 * resto del dominio — ya paso una vez: se empezo con API-Football, cuyo
 * plan gratuito resulto no incluir la temporada en curso.
 */
export interface FootballProvider {
  /** Fixtures de la jornada en curso (o la siguiente si no hay ninguna en curso) de una liga+temporada. */
  getCurrentRoundFixtures(leagueId: number, season: number): Promise<ProviderFixture[]>;

  /** Estado/resultado actualizado de un conjunto de fixtures por su id externo. */
  getFixturesByIds(fixtureIds: number[]): Promise<ProviderFixture[]>;
}

export const FOOTBALL_PROVIDER = Symbol('FOOTBALL_PROVIDER');
