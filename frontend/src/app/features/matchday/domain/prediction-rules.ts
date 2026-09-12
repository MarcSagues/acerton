import { CurrentMatchdayEntry, Match, PredictionChoice } from '../../../core/models/matchday.model';
import { DoubleChanceOption } from '../../../core/models/prediction.model';

export interface PredictionSelection {
  choice: PredictionChoice | null;
  doubleChanceOption: DoubleChanceOption | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  pointsEarned: number | null;
}

const DOUBLE_CHANCE_COVERAGE: Record<DoubleChanceOption, PredictionChoice[]> = {
  HOME_OR_DRAW: ['HOME', 'DRAW'],
  DRAW_OR_AWAY: ['DRAW', 'AWAY'],
  HOME_OR_AWAY: ['HOME', 'AWAY'],
};

const DOUBLE_CHANCE_LABEL: Record<DoubleChanceOption, string> = {
  HOME_OR_DRAW: '1X',
  DRAW_OR_AWAY: 'X2',
  HOME_OR_AWAY: '12',
};

export function isMatchPredictable(match: Match, now: Date): boolean {
  return match.status === 'SCHEDULED' && new Date(match.kickoff).getTime() > now.getTime();
}

export function predictionLabel(selection: PredictionSelection | undefined, exactScore: boolean): string | null {
  if (!selection) return null;
  if (exactScore) {
    if (selection.predictedHomeScore == null || selection.predictedAwayScore == null) return null;
    return `${selection.predictedHomeScore}-${selection.predictedAwayScore}`;
  }
  if (selection.doubleChanceOption) return DOUBLE_CHANCE_LABEL[selection.doubleChanceOption];
  if (selection.choice === 'HOME') return '1';
  if (selection.choice === 'AWAY') return '2';
  if (selection.choice === 'DRAW') return 'X';
  return null;
}

export function outcomeOf(home: number, away: number): PredictionChoice {
  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

export function exactScorePoints(match: Match, selection: PredictionSelection): number | null {
  if (
    selection.predictedHomeScore == null ||
    selection.predictedAwayScore == null ||
    match.homeScore == null ||
    match.awayScore == null
  ) {
    return null;
  }
  if (selection.predictedHomeScore === match.homeScore && selection.predictedAwayScore === match.awayScore) {
    return 5;
  }
  return outcomeOf(selection.predictedHomeScore, selection.predictedAwayScore) === outcomeOf(match.homeScore, match.awayScore)
    ? 2
    : 0;
}

export function isPredictionHit(
  match: Match,
  selection: PredictionSelection | undefined,
  exactScore: boolean,
): boolean | null {
  if (!selection || !match.result) return null;
  if (exactScore) {
    const points = exactScorePoints(match, selection);
    return points == null ? null : points > 0;
  }
  if (selection.doubleChanceOption) {
    return DOUBLE_CHANCE_COVERAGE[selection.doubleChanceOption].includes(match.result);
  }
  return selection.choice ? selection.choice === match.result : null;
}

export function pointsForPrediction(
  match: Match,
  selection: PredictionSelection | undefined,
  exactScore: boolean,
): number {
  if (selection?.pointsEarned != null) return selection.pointsEarned;
  if (match.status !== 'FINISHED' || !selection) return 0;
  if (exactScore) return exactScorePoints(match, selection) ?? 0;
  return isPredictionHit(match, selection, false) === true ? 1 : 0;
}

export type MatchAccentTone = 'none' | 'pending' | 'hit' | 'partial' | 'miss';

/**
 * Color de la linea superior de la tarjeta de partido: sin pronostico no
 * hay linea; con pronostico enviado y partido aun no acabado, en acento
 * ("amarillo"); ya acabado, en verde si acierto, rojo si fallo. En modo
 * resultado exacto un acierto de solo el ganador (2 pts, no 5) se deja en
 * acento en vez de verde — un acierto a medias no es un acierto pleno.
 */
export function matchAccentTone(
  match: Match,
  selection: PredictionSelection | undefined,
  exactScore: boolean,
): MatchAccentTone {
  const hasPrediction = exactScore
    ? selection?.predictedHomeScore != null && selection?.predictedAwayScore != null
    : !!(selection?.choice || selection?.doubleChanceOption);

  if (!hasPrediction) return 'none';
  if (match.status !== 'FINISHED' || !match.result) return 'pending';

  if (exactScore) {
    const points = exactScorePoints(match, selection!);
    if (points == null) return 'pending';
    if (points === 5) return 'hit';
    if (points === 2) return 'partial';
    return 'miss';
  }

  return isPredictionHit(match, selection, false) ? 'hit' : 'miss';
}

export function lockedMatchLabel(match: Match): string {
  if (match.status === 'POSTPONED') return 'Aplazado';
  if (match.status === 'CANCELLED') return 'Cancelado';
  return 'En juego';
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function matchDayLabel(kickoff: string, today: Date): string {
  const date = new Date(kickoff);
  if (isSameDay(date, today)) return 'Hoy';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) return 'Mañana';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

export function predictionSummary(
  entry: CurrentMatchdayEntry,
  selections: ReadonlyMap<string, PredictionSelection>,
  exactScore: boolean,
): string {
  // Solo los partidos con pronostico enviado: el resumen ya se puede ver y
  // copiar sin haber completado toda la jornada, asi que no tiene sentido
  // listar aqui los que todavia no se han rellenado.
  const lines = entry.matchday.matches
    .map((match) => ({ match, label: predictionLabel(selections.get(match.id), exactScore) }))
    .filter((row): row is { match: (typeof entry.matchday.matches)[number]; label: string } => row.label != null)
    .map((row) => `${row.match.homeTeam} - ${row.match.awayTeam}: ${row.label}`);
  return [
    `Piqo · ${entry.competition.name} · Jornada ${entry.matchday.order}`,
    '',
    ...lines,
    '',
    'Pronosticos enviados',
  ].join('\n');
}
