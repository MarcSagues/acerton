import { FavoriteTeam } from './favorite-team.model';

/** Un grupo que compartes con el jugador, con sus aciertos, fallos y racha en el. */
export interface PlayerSharedGroup {
  groupId: string;
  name: string;
  scored: number;
  hits: number;
  misses: number;
  streak: { current: number; longest: number };
}

/** Un marcador exacto que el jugador clavo. */
export interface PlayerExactScore {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string | null;
  awayTeamShort: string | null;
  homeScore: number;
  awayScore: number;
  kickoff: string;
}

export interface PlayerBadge {
  code: string;
  name: string;
  description: string;
  earnedAt: string;
}

/** Perfil general de un jugador (`GET players/:userId`): lo que se abre al pulsar a alguien en el Quiz, Tabla, etc. */
export interface PlayerProfile {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  level: number;
  favoriteTeam: FavoriteTeam | null;
  isMe: boolean;
  /** Predicciones puntuadas en todos sus grupos. `hitRate` es null si todavia no tiene ninguna. */
  predictions: { scored: number; hits: number; misses: number; hitRate: number | null };
  /**
   * Marcadores exactos clavados en grupos de resultado exacto: cuantos (`hits`), de cuantos pronosticos de marcador con partido
   * ya jugado (`played`), y los ultimos partidos clavados.
   */
  exactScores: { hits: number; played: number; recent: PlayerExactScore[] };
  /** Racha global (todos sus grupos). */
  streak: { current: number; longest: number };
  groupsCount: number;
  /** Solo los grupos que compartes con el jugador (todos los suyos si es el tuyo). */
  sharedGroups: PlayerSharedGroup[];
  quiz: {
    seasonLabel: string;
    /** Su puesto en el Quiz de esta temporada, o null si todavia no ha jugado. */
    position: number | null;
    total: number;
    points: number;
    quizzesPlayed: number;
    hits: number;
    misses: number;
  };
  badges: PlayerBadge[];
}
