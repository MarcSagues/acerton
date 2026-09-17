import { MatchdayStatus, MatchStatus, PredictionChoice } from '@prisma/client';

export interface MatchdayCloseCheck {
  status: MatchdayStatus;
  closesAt: Date;
}

/**
 * Una jornada se cierra cuando llega su hora de cierre (kickoff del primer
 * partido) y todavia no estaba cerrada/finalizada. Logica pura para poder
 * testearla sin base de datos.
 */
export function shouldCloseMatchday(matchday: MatchdayCloseCheck, now: Date): boolean {
  if (matchday.status === 'CLOSED' || matchday.status === 'FINISHED') {
    return false;
  }
  return matchday.closesAt.getTime() <= now.getTime();
}

export interface ReminderCheck {
  status: MatchdayStatus;
  closesAt: Date;
  /** Marca de ese aviso concreto (5h/1h/30min); null = todavia no enviado. */
  reminderSentAt: Date | null;
}

/**
 * Un aviso de cierre se envia cuando la jornada sigue abierta, ese aviso en
 * concreto no se ha mandado todavia, y el cierre cae dentro de la ventana
 * (entre ahora y ahora+windowMs). Logica pura, independiente de cual de los
 * 3 avisos (5h/1h/30min) se este evaluando.
 */
export function shouldSendReminder(matchday: ReminderCheck, windowMs: number, now: Date): boolean {
  if (matchday.status !== 'OPEN' || matchday.reminderSentAt !== null) {
    return false;
  }
  const msUntilClose = matchday.closesAt.getTime() - now.getTime();
  return msUntilClose >= 0 && msUntilClose <= windowMs;
}

export interface MatchPredictabilityCheck {
  status: MatchStatus;
  kickoff: Date;
}

/**
 * Un partido admite predicciones/ediciones hasta su propio kickoff, con
 * independencia de si otros partidos de la misma jornada ya han empezado
 * (el calendario real a veces adelanta un partido varios dias respecto al
 * resto de la jornada). Logica pura, por eso vive al lado de
 * shouldCloseMatchday en vez de usar Matchday.closesAt como corte global.
 */
export function isMatchPredictable(match: MatchPredictabilityCheck, now: Date): boolean {
  if (match.status !== 'SCHEDULED') {
    return false;
  }
  return match.kickoff.getTime() > now.getTime();
}

export interface MatchReminderCheck {
  status: MatchStatus;
  kickoff: Date;
  /** Marca de ese aviso concreto (24h/5h/1h/30min) para ESTE partido; null = todavia no enviado. */
  reminderSentAt: Date | null;
}

/**
 * Igual que shouldSendReminder pero anclado al kickoff de un partido
 * concreto en vez del cierre global de la jornada (Matchday.closesAt, que
 * solo refleja el primer partido) — asi una jornada repartida en varios
 * dias avisa de cada partido segun cuando empieza de verdad el, no solo el
 * primero de todos.
 */
export function shouldSendMatchReminder(
  match: MatchReminderCheck,
  windowMs: number,
  now: Date,
): boolean {
  if (match.status !== 'SCHEDULED' || match.reminderSentAt !== null) {
    return false;
  }
  const msUntilKickoff = match.kickoff.getTime() - now.getTime();
  return msUntilKickoff >= 0 && msUntilKickoff <= windowMs;
}

export interface CurrentMatchdayEntrySortKey {
  matchday: { status: MatchdayStatus; closesAt: Date };
}

/**
 * Orden de las jornadas "actuales" de un grupo con varias competiciones
 * (ver MatchdaysController.getCurrentForGroup): la primera pestaña debe
 * ser la que este mas cerca de empezar/cerrar, no el orden en que se
 * activaron las competiciones en el grupo. Las jornadas todavia con algo
 * pendiente (no FINISHED) van primero, ordenadas por cierre mas proximo;
 * las que ya terminaron del todo (la competicion no tiene ninguna jornada
 * pendiente) van al final, mas reciente primero. Logica pura para poder
 * testearla sin base de datos.
 */
export function sortCurrentMatchdayEntries<T extends CurrentMatchdayEntrySortKey>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => {
    const aFinished = a.matchday.status === 'FINISHED';
    const bFinished = b.matchday.status === 'FINISHED';
    if (aFinished !== bFinished) {
      return aFinished ? 1 : -1;
    }
    const diff = a.matchday.closesAt.getTime() - b.matchday.closesAt.getTime();
    return aFinished ? -diff : diff;
  });
}

/** 1X2 a partir del marcador final; null si el partido no ha terminado. */
export function computeMatchResult(
  homeGoals: number | null,
  awayGoals: number | null,
): PredictionChoice | null {
  if (homeGoals === null || awayGoals === null) {
    return null;
  }
  if (homeGoals > awayGoals) return 'HOME';
  if (homeGoals < awayGoals) return 'AWAY';
  return 'DRAW';
}

/**
 * Intenta extraer un numero de orden del nombre de ronda del proveedor
 * (ej. "Regular Season - 5" -> 5, formato habitual de liga regular). Exige
 * un guion antes del numero para no confundir rondas de eliminatoria como
 * "Round of 16" (16 equipos, no "ronda 16") con un numero de jornada; esas
 * rondas usan el indice de fallback para mantener un orden estable.
 */
export function parseRoundOrder(roundName: string, fallbackIndex: number): number {
  const match = /-\s*(\d+)\s*$/.exec(roundName.trim());
  return match ? parseInt(match[1], 10) : fallbackIndex;
}
