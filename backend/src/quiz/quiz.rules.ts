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

const OTHER_TYPES = QUESTION_TYPES.filter((type) => type !== 'WINNER');

/**
 * Preguntas del quiz mixto: cada partido elegido empieza por quien gana y sigue con otros tipos (distintos, rotando de un
 * partido a otro para que no salgan siempre los mismos); en el quiz van por orden de inicio, las de un partido juntas.
 */
export function generateMixedQuizQuestions(candidates: QuizCandidate[]) {
  const items = planMixedQuiz(candidates).flatMap(({ match, count }, rank) =>
    Array.from({ length: count }, (_, k) => ({
      match,
      type: k === 0 ? ('WINNER' as const) : OTHER_TYPES[(rank + k - 1) % OTHER_TYPES.length],
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
/** Hora de los cortes del Quiz (Madrid): los martes y los viernes a esta hora cierra un quiz y abre el siguiente. */
export const QUIZ_CUT_HOUR = 18;

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

/** Un dia (calendario en UTC) a una hora de Madrid, como instante. */
function madridAt(day: Date, hour: number): Date {
  const guess = day.getTime() + hour * 60 * 60 * 1000;
  const first = guess - madridOffsetMs(guess);
  return new Date(guess - madridOffsetMs(first));
}

/** Cortes del Quiz alrededor de un instante: martes y viernes a las QUIZ_CUT_HOUR de Madrid, en orden. */
function cutsAround(date: Date): Date[] {
  const { year, month, day } = madridParts(date);
  const cuts: Date[] = [];
  for (let offset = -8; offset <= 16; offset++) {
    const calendar = new Date(Date.UTC(year, month - 1, day + offset));
    const weekday = calendar.getUTCDay();
    if (weekday === 2 || weekday === 5) cuts.push(madridAt(calendar, QUIZ_CUT_HOUR));
  }
  return cuts;
}

/**
 * Un quiz mixto (peticion del usuario, 2026-10-15): se juega con fechas fijas, de un corte al siguiente, y sus
 * preguntas son de los partidos que se juegan despues, hasta el corte siguiente (mientras esta abierto el otro quiz):
 * - WEEKEND, quiz de ligas: se juega de martes a viernes a las 18:00; partidos de liga de viernes 18:00 a martes 18:00.
 * - MIDWEEK, quiz de Champions: se juega de viernes a martes a las 18:00; partidos de Champions de martes a viernes.
 * `start`-`end` son los limites de los partidos; el quiz cierra en `start`.
 */
export interface QuizWindow {
  key: string;
  kind: QuizWindowKind;
  opensAt: Date;
  start: Date;
  end: Date;
}

function windowFrom(opensAt: Date, start: Date, end: Date): QuizWindow {
  const kind: QuizWindowKind = madridParts(start).weekday === 5 ? 'WEEKEND' : 'MIDWEEK';
  const { year, month, day } = madridParts(start);
  const date = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  return { key: `${date}-${kind}`, kind, opensAt, start, end };
}

/** El quiz que se juega en este momento: el que abrio en el ultimo corte y cierra en el siguiente. */
export function openQuizWindow(now: Date): QuizWindow {
  const cuts = cutsAround(now);
  const i = cuts.findIndex((cut, index) => cut <= now && now < cuts[index + 1]);
  return windowFrom(cuts[i], cuts[i + 1], cuts[i + 2]);
}

/** Ligas de cada quiz: el de ligas, todas menos la Champions; el de Champions, solo ella. */
export function windowCompetitions(kind: QuizWindowKind): CompetitionCode[] {
  return kind === 'MIDWEEK'
    ? ['CHAMPIONS_LEAGUE']
    : QUIZ_COMPETITIONS.filter((code) => code !== 'CHAMPIONS_LEAGUE');
}

/**
 * Resolucion de una pregunta de un quiz mixto: se anula si su partido empezo antes del cierre del quiz (se adelanto),
 * porque se pudo responder viendolo; si no, como cualquier otra.
 */
export function resolveMixedQuestion(
  type: QuizQuestionType,
  match: Match,
  closesAt: Date,
): { resolution: QuizResolution; correctOption: QuizOption | null } {
  if (match.kickoff.getTime() < closesAt.getTime() && match.status !== 'POSTPONED') {
    return { resolution: 'VOID', correctOption: null };
  }
  return resolveQuizQuestion(type, match);
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
