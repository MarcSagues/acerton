import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AppConfig } from '../config/configuration';
import {
  FootballProvider,
  ProviderFixture,
  ProviderFixtureStatus,
} from './football-provider.interface';

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: { name: string; crest: string | null };
  awayTeam: { name: string; crest: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
}

interface FootballDataCompetition {
  currentSeason: { currentMatchday: number | null } | null;
}

// football-data.org limita el numero de ids por peticion a /matches?ids=;
// 20 es un tamano de lote conservador y sobradamente seguro.
const MAX_IDS_PER_REQUEST = 20;

const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED']);
const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED']);
const POSTPONED_STATUSES = new Set(['POSTPONED', 'SUSPENDED']);

function mapStatus(status: string): ProviderFixtureStatus {
  if (FINISHED_STATUSES.has(status)) return 'FINISHED';
  if (LIVE_STATUSES.has(status)) return 'LIVE';
  if (POSTPONED_STATUSES.has(status)) return 'POSTPONED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'SCHEDULED'; // SCHEDULED, TIMED
}

function mapMatch(match: FootballDataMatch): ProviderFixture {
  return {
    fixtureId: match.id,
    // Formato "Regular Season - N" para reutilizar parseRoundOrder tal cual.
    round: `Regular Season - ${match.matchday}`,
    kickoff: new Date(match.utcDate),
    homeTeam: { name: match.homeTeam.name, logoUrl: match.homeTeam.crest },
    awayTeam: { name: match.awayTeam.name, logoUrl: match.awayTeam.crest },
    status: mapStatus(match.status),
    homeGoals: match.score.fullTime.home,
    awayGoals: match.score.fullTime.away,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

@Injectable()
export class FootballDataOrgProvider implements FootballProvider {
  private readonly logger = new Logger(FootballDataOrgProvider.name);
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    this.http = axios.create({
      baseURL: this.configService.get('footballData.baseUrl', { infer: true }),
      headers: { 'X-Auth-Token': this.configService.get('footballData.apiKey', { infer: true }) },
      timeout: 10_000,
    });
  }

  async getCurrentRoundFixtures(
    competitionExternalId: number,
    season: number,
  ): Promise<ProviderFixture[]> {
    this.logger.log(`Peticion football-data.org: /competitions/${competitionExternalId}`);
    const competitionResponse = await this.http.get<FootballDataCompetition>(
      `/competitions/${competitionExternalId}`,
    );
    const currentMatchday = competitionResponse.data.currentSeason?.currentMatchday;
    if (!currentMatchday) {
      this.logger.warn(`Sin jornada en curso para competicion ${competitionExternalId}`);
      return [];
    }

    return this.getFixturesForRound(competitionExternalId, season, currentMatchday);
  }

  async getFixturesForRound(
    competitionExternalId: number,
    season: number,
    round: number,
  ): Promise<ProviderFixture[]> {
    this.logger.log(
      `Peticion football-data.org: /competitions/${competitionExternalId}/matches jornada=${round}`,
    );
    const matchesResponse = await this.http.get<{ matches: FootballDataMatch[] }>(
      `/competitions/${competitionExternalId}/matches`,
      { params: { matchday: round, season } },
    );

    return matchesResponse.data.matches.map(mapMatch);
  }

  async getFixturesByIds(fixtureIds: number[]): Promise<ProviderFixture[]> {
    if (fixtureIds.length === 0) {
      return [];
    }

    const batches = chunk(fixtureIds, MAX_IDS_PER_REQUEST);
    const results: ProviderFixture[] = [];
    for (const batch of batches) {
      this.logger.log(`Peticion football-data.org: /matches ids=${batch.length}`);
      const response = await this.http.get<{ matches: FootballDataMatch[] }>('/matches', {
        params: { ids: batch.join(',') },
      });
      results.push(...response.data.matches.map(mapMatch));
    }
    return results;
  }
}
