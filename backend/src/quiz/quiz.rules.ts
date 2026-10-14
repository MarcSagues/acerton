import {
  CompetitionCode,
  Match,
  QuizOption,
  QuizQuestionType,
  QuizResolution,
} from '@prisma/client';
import { isKickoffTimeUnconfirmed } from '../matchdays/matchday.util';

export const QUIZ_COMPETITIONS: CompetitionCode[] = [
  'LA_LIGA',
  'PREMIER_LEAGUE',
  'SERIE_A',
  'BUNDESLIGA',
  'LIGUE_1',
  'CHAMPIONS_LEAGUE',
];

// Exact aliases, never substring matches ("Madrid" could identify several clubs).
const REQUIRED = [
  'fc barcelona',
  'barcelona',
  'barca',
  'real madrid cf',
  'real madrid',
  'liverpool fc',
  'liverpool',
];
const FEATURED = [
  ...REQUIRED,
  'club atletico de madrid',
  'atletico de madrid',
  'atletico madrid',
  'atleti',
  'arsenal fc',
  'arsenal',
  'manchester city fc',
  'manchester city',
  'manchester united fc',
  'manchester united',
  'chelsea fc',
  'chelsea',
  'tottenham hotspur fc',
  'tottenham hotspur',
  'tottenham',
  'fc internazionale milano',
  'internazionale',
  'inter',
  'inter milan',
  'ac milan',
  'milan',
  'juventus fc',
  'juventus',
  'ssc napoli',
  'napoli',
  'fc bayern munchen',
  'bayern munchen',
  'bayern',
  'borussia dortmund',
  'dortmund',
  'paris saint-germain fc',
  'paris saint-germain',
  'psg',
  'olympique de marseille',
  'marseille',
];

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function teamIn(match: Match, side: 'home' | 'away', aliases: string[]): boolean {
  const names =
    side === 'home' ? [match.homeTeam, match.homeTeamShort] : [match.awayTeam, match.awayTeamShort];
  return names.some((name) => name !== null && aliases.includes(normalize(name)));
}

export function selectQuizMatches(matches: Match[]): Match[] {
  const priority = (match: Match) => {
    const required =
      Number(teamIn(match, 'home', REQUIRED)) + Number(teamIn(match, 'away', REQUIRED));
    const featured =
      Number(teamIn(match, 'home', FEATURED)) + Number(teamIn(match, 'away', FEATURED));
    return required * 10 + featured;
  };
  return [...matches]
    .filter((match) => match.status !== 'CANCELLED')
    .sort(
      (a, b) =>
        priority(b) - priority(a) ||
        a.kickoff.getTime() - b.kickoff.getTime() ||
        a.externalId - b.externalId,
    )
    .slice(0, 10);
}

export const QUESTION_TYPES: QuizQuestionType[] = [
  'WINNER',
  'BOTH_SCORE',
  'OVER_2_5',
  'HOME_CLEAN_SHEET',
  'AWAY_CLEAN_SHEET',
  'HOME_TWO_PLUS',
  'AWAY_TWO_PLUS',
  'WIN_BY_TWO_PLUS',
];

export function questionOptions(type: QuizQuestionType): QuizOption[] {
  return type === 'WINNER' ? ['HOME', 'DRAW', 'AWAY'] : ['YES', 'NO'];
}

export function generateQuizQuestions(matches: Match[]) {
  const selected = selectQuizMatches(matches);
  const count = Math.min(10, selected.length * QUESTION_TYPES.length);
  return Array.from({ length: count }, (_, index) => {
    const matchIndex = index % selected.length;
    const cycle = Math.floor(index / selected.length);
    const type = QUESTION_TYPES[(matchIndex + cycle) % QUESTION_TYPES.length];
    return {
      matchId: selected[matchIndex].id,
      order: index + 1,
      type,
      options: questionOptions(type),
    };
  });
}

export function resolveQuizQuestion(
  type: QuizQuestionType,
  match: Match,
): {
  resolution: QuizResolution;
  correctOption: QuizOption | null;
} {
  if (match.status === 'CANCELLED') return { resolution: 'VOID', correctOption: null };
  if (match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return { resolution: 'PENDING', correctOption: null };
  }
  const home = match.homeScore;
  const away = match.awayScore;
  if (type === 'WINNER') {
    return {
      resolution: 'RESOLVED',
      correctOption: home > away ? 'HOME' : home < away ? 'AWAY' : 'DRAW',
    };
  }
  const conditions: Record<Exclude<QuizQuestionType, 'WINNER'>, boolean> = {
    BOTH_SCORE: home > 0 && away > 0,
    OVER_2_5: home + away > 2,
    HOME_CLEAN_SHEET: away === 0,
    AWAY_CLEAN_SHEET: home === 0,
    HOME_TWO_PLUS: home >= 2,
    AWAY_TWO_PLUS: away >= 2,
    WIN_BY_TWO_PLUS: Math.abs(home - away) >= 2,
  };
  return { resolution: 'RESOLVED', correctOption: conditions[type] ? 'YES' : 'NO' };
}

/** Uses every match in the round, including those omitted from the quiz. */
export function quizDeadline(matches: Match[], fallback: Date) {
  const active = matches.filter((match) => match.status !== 'CANCELLED');
  const first = [...active].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())[0];
  return {
    closesAt: first?.kickoff ?? fallback,
    kickoffConfirmed: first ? !isKickoffTimeUnconfirmed(first.kickoff) : false,
  };
}

export function mustLockQuiz(
  lockedAt: Date | null,
  matches: Match[],
  closesAt: Date,
  now: Date,
): boolean {
  return (
    lockedAt !== null ||
    closesAt.getTime() <= now.getTime() ||
    matches.some((match) => match.status === 'LIVE' || match.status === 'FINISHED')
  );
}
