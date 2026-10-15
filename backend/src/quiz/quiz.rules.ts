import {
  CompetitionCode,
  Match,
  QuizOption,
  QuizQuestionType,
  QuizResolution,
  QuizWindowKind,
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
/** Clubes de nivel: dan interes a un partido cuando no hay grandes (y dos de ellos ya son un buen partido). */
const NOTABLE = [
  'bayer 04 leverkusen',
  'leverkusen',
  'rb leipzig',
  'vfb stuttgart',
  'eintracht frankfurt',
  'aston villa fc',
  'aston villa',
  'newcastle united fc',
  'newcastle',
  'as roma',
  'roma',
  'ss lazio',
  'lazio',
  'atalanta bc',
  'atalanta',
  'acf fiorentina',
  'fiorentina',
  'sevilla fc',
  'sevilla',
  'villarreal cf',
  'villarreal',
  'athletic club',
  'athletic',
  'real sociedad de futbol',
  'real sociedad',
  'real betis balompie',
  'betis',
  'as monaco fc',
  'monaco',
  'olympique lyonnais',
  'lyon',
  'lille osc',
  'lille',
  'sport lisboa e benfica',
  'benfica',
  'fc porto',
  'porto',
  'sporting clube de portugal',
  'sporting cp',
  'afc ajax',
  'ajax',
  'psv',
  'feyenoord rotterdam',
  'feyenoord',
  'galatasaray sk',
  'galatasaray',
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

/** Preguntas de cada quiz mixto. */
export const QUIZ_QUESTION_COUNT = 20;

/** Un partido candidato con la liga a la que pertenece (el quiz mixto mezcla ligas). */
export type QuizCandidate = Match & { competitionCode: CompetitionCode };

function teamWeight(match: Match, side: 'home' | 'away'): number {
  if (teamIn(match, side, REQUIRED)) return 10;
  if (teamIn(match, side, FEATURED)) return 3;
  if (teamIn(match, side, NOTABLE)) return 1;
  return 0;
}

/**
 * Interes de un partido: Barca, Madrid y Liverpool siempre por delante; despues los grandes, con un extra si se
 * enfrentan dos (clasicos, derbis, cruces de Champions), y los clubes de nivel para cuando no hay grandes.
 */
export function matchInterest(match: QuizCandidate): number {
  const home = teamWeight(match, 'home');
  const away = teamWeight(match, 'away');
  const bigMatch = home >= 3 && away >= 3 ? 5 : 0;
  return home + away + bigMatch + (match.competitionCode === 'CHAMPIONS_LEAGUE' ? 1 : 0);
}

/** Preguntas que pide un partido: 4 si se enfrentan dos grandes, 2 si juega uno (o dos de nivel) y 1 si no. */
export function questionTarget(match: QuizCandidate): number {
  const home = teamWeight(match, 'home');
  const away = teamWeight(match, 'away');
  if (home >= 3 && away >= 3) return 4;
  if (home >= 3 || away >= 3 || (home >= 1 && away >= 1)) return 2;
  return 1;
}

function byInterest(a: QuizCandidate, b: QuizCandidate): number {
  return (
    matchInterest(b) - matchInterest(a) ||
    a.kickoff.getTime() - b.kickoff.getTime() ||
    a.externalId - b.externalId
  );
}

/**
 * Reparto de las 20 preguntas del quiz mixto (peticion del usuario, 2026-10-15): el mejor partido de cada liga entra
 * siempre, y el resto de preguntas van a los partidos mas interesantes de cualquier liga, sin repartir por igual. Los
 * grandes partidos llevan mas preguntas (ver questionTarget). Si no hay bastantes partidos, los elegidos reciben preguntas
 * de mas (hasta un tipo de pregunta de cada). Devuelve los partidos elegidos, del mas interesante al que menos, con
 * cuantas preguntas lleva cada uno.
 */
export function planMixedQuiz(
  candidates: QuizCandidate[],
  total = QUIZ_QUESTION_COUNT,
): { match: QuizCandidate; count: number }[] {
  const sorted = candidates.filter((match) => match.status !== 'CANCELLED').sort(byInterest);
  const counts = new Map<string, number>();
  let budget = total;
  const give = (match: QuizCandidate, limit: number) => {
    while (budget > 0 && (counts.get(match.id) ?? 0) < limit) {
      counts.set(match.id, (counts.get(match.id) ?? 0) + 1);
      budget--;
    }
  };
  const leagues = new Set<CompetitionCode>();
  for (const match of sorted) {
    if (leagues.has(match.competitionCode)) continue;
    leagues.add(match.competitionCode);
    give(match, 1);
  }
  for (const match of sorted) give(match, questionTarget(match));
  for (let limit = 2; budget > 0 && limit <= QUESTION_TYPES.length; limit++) {
    for (const match of sorted) if (counts.has(match.id)) give(match, limit);
  }
  return sorted
    .filter((match) => counts.has(match.id))
    .map((match) => ({ match, count: counts.get(match.id)! }));
}

/**
 * Preguntas del quiz mixto: cada partido elegido con sus tipos de pregunta (distintos, rotando de un partido a otro para
 * que no salga siempre el mismo), y en el quiz por orden de inicio, con las preguntas de un mismo partido juntas.
 */
export function generateMixedQuizQuestions(candidates: QuizCandidate[]) {
  const items = planMixedQuiz(candidates).flatMap(({ match, count }, rank) =>
    Array.from({ length: count }, (_, k) => ({
      match,
      type: QUESTION_TYPES[(rank + k) % QUESTION_TYPES.length],
      k,
    })),
  );
  items.sort(
    (a, b) =>
      a.match.kickoff.getTime() - b.match.kickoff.getTime() ||
      a.match.externalId - b.match.externalId ||
      a.k - b.k,
  );
  return items.map((item, index) => ({
    matchId: item.match.id,
    order: index + 1,
    type: item.type,
    options: questionOptions(item.type),
  }));
}

const MADRID = 'Europe/Madrid';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Un quiz mixto se publica dos dias antes de que empiece su ventana. */
export const QUIZ_OPEN_LEAD_MS = 2 * DAY_MS;

const madridFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MADRID,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  weekday: 'short',
  hourCycle: 'h23',
});

function madridParts(date: Date) {
  const parts = madridFormat.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

/** Lo que Madrid va por delante de UTC en ese instante (1 h en invierno, 2 h en verano). */
function madridOffsetMs(instant: number): number {
  const p = madridParts(new Date(instant));
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(instant / 1000) * 1000
  );
}

/** Medianoche de Madrid de un dia (calendario en UTC), como instante. */
function madridMidnight(day: Date): Date {
  const guess = day.getTime();
  const first = guess - madridOffsetMs(guess);
  return new Date(guess - madridOffsetMs(first));
}

export interface QuizWindow {
  key: string;
  kind: QuizWindowKind;
  start: Date;
  end: Date;
}

/**
 * Ventana del quiz mixto en la que cae un instante (hora de Madrid): fin de semana de viernes a lunes y entre semana de
 * martes a jueves. `end` es el inicio de la ventana siguiente.
 */
export function quizWindowFor(date: Date): QuizWindow {
  const { year, month, day, weekday } = madridParts(date);
  const weekend = weekday === 5 || weekday === 6 || weekday === 0 || weekday === 1;
  // Dias desde el inicio de la ventana: el viernes en la de fin de semana, el martes en la de entre semana.
  const back = weekend ? (weekday + 2) % 7 : weekday - 2;
  const startDay = new Date(Date.UTC(year, month - 1, day - back));
  const endDay = new Date(startDay.getTime() + (weekend ? 4 : 3) * DAY_MS);
  const kind: QuizWindowKind = weekend ? 'WEEKEND' : 'MIDWEEK';
  return {
    key: `${startDay.toISOString().slice(0, 10)}-${kind}`,
    kind,
    start: madridMidnight(startDay),
    end: madridMidnight(endDay),
  };
}

/** Ventanas que se pueden publicar ahora: la actual y, si empieza en menos de QUIZ_OPEN_LEAD_MS, la siguiente. */
export function publishableWindows(now: Date): QuizWindow[] {
  const current = quizWindowFor(now);
  const next = quizWindowFor(current.end);
  return next.start.getTime() - now.getTime() <= QUIZ_OPEN_LEAD_MS ? [current, next] : [current];
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
