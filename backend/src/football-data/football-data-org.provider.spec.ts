import { ConfigService } from '@nestjs/config';
import { FootballDataOrgProvider } from './football-data-org.provider';

/** Dos partidos tal cual los devolvio football-data.org para la jornada 8 de La Liga (2026-10-05), recortados. */
const MATCHES = [
  {
    id: 564700,
    utcDate: '2026-10-10T16:30:00Z',
    status: 'TIMED',
    matchday: 8,
    homeTeam: {
      id: 81,
      name: 'FC Barcelona',
      shortName: 'Barça',
      tla: 'FCB',
      crest: 'https://crests.football-data.org/81.png',
    },
    awayTeam: {
      id: 82,
      name: 'Getafe CF',
      shortName: 'Getafe',
      tla: 'GET',
      crest: 'https://crests.football-data.org/82.png',
    },
    score: { fullTime: { home: null, away: null } },
  },
  {
    id: 564699,
    utcDate: '2026-10-10T14:15:00Z',
    status: 'TIMED',
    matchday: 8,
    homeTeam: { id: 263, name: 'Deportivo Alavés', shortName: '', tla: 'ALA', crest: null },
    awayTeam: { id: 78, name: 'Club Atlético de Madrid', tla: 'ATL', crest: null },
    score: { fullTime: { home: null, away: null } },
  },
];

function buildProvider(): FootballDataOrgProvider {
  const config = { get: jest.fn() } as unknown as ConfigService<never, true>;
  const provider = new FootballDataOrgProvider(config);
  (provider as unknown as { http: unknown }).http = {
    get: jest.fn().mockResolvedValue({ data: { matches: MATCHES } }),
  };
  return provider;
}

describe('FootballDataOrgProvider (respuesta real de football-data.org)', () => {
  it('trae el nombre corto de cada equipo ("Barça", "Getafe")', async () => {
    const [barca] = await buildProvider().getFixturesForRound(2014, 2026, 8);

    expect(barca.homeTeam).toEqual({
      name: 'FC Barcelona',
      shortName: 'Barça',
      logoUrl: 'https://crests.football-data.org/81.png',
    });
    expect(barca.awayTeam.shortName).toBe('Getafe');
  });

  it('un nombre corto vacio o ausente queda en null', async () => {
    const [, alaves] = await buildProvider().getFixturesForRound(2014, 2026, 8);

    expect(alaves.homeTeam.shortName).toBeNull();
    expect(alaves.awayTeam.shortName).toBeNull();
  });

  it('TIMED es un partido programado con su hora real', async () => {
    const [barca] = await buildProvider().getFixturesByIds([564700]);

    expect(barca.status).toBe('SCHEDULED');
    expect(barca.kickoff.toISOString()).toBe('2026-10-10T16:30:00.000Z');
  });
});
