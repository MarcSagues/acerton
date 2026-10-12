import { Match, QuizQuestionType } from '@prisma/client';
import {
  generateQuizQuestions,
  mustLockQuiz,
  QUESTION_TYPES,
  quizDeadline,
  resolveQuizQuestion,
  selectQuizMatches,
} from './quiz.rules';

function match(id: number, overrides: Partial<Match> = {}): Match {
  return {
    id: `m${id}`,
    externalId: id,
    matchdayId: 'round',
    homeTeam: `Club ${id}`,
    awayTeam: 'Rival',
    homeTeamLogo: null,
    awayTeamLogo: null,
    kickoff: new Date(`2030-10-12T${String(10 + (id % 10)).padStart(2, '0')}:00:00Z`),
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    result: null,
    reminder24hSentAt: null,
    reminder5hSentAt: null,
    reminder1hSentAt: null,
    reminder30mSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('quiz selection and generation', () => {
  it('includes Barcelona, Madrid and Liverpool before other clubs and never confuses Madrid aliases', () => {
    const matches = Array.from({ length: 12 }, (_, i) => match(i));
    matches[9].homeTeam = 'FC Barcelona';
    matches[10].awayTeam = 'Real Madrid CF';
    matches[11].homeTeam = 'Liverpool FC';
    matches[0].homeTeam = 'Rayo de Madrid';
    const selected = selectQuizMatches(matches);
    expect(selected).toHaveLength(10);
    expect(
      selected
        .slice(0, 3)
        .map((m) => m.id)
        .sort(),
    ).toEqual(['m10', 'm11', 'm9']);
    expect(selectQuizMatches([...matches].reverse())).toEqual(selected);
  });

  it('generates stable different questions, covering every selected match in small leagues', () => {
    const matches = Array.from({ length: 9 }, (_, i) => match(i));
    const questions = generateQuizQuestions(matches);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((q) => q.matchId)).size).toBe(9);
    expect(new Set(questions.map((q) => `${q.matchId}:${q.type}`)).size).toBe(10);
    expect(generateQuizQuestions(matches.reverse())).toEqual(questions);
    expect(new Set(questions.map((q) => q.type)).size).toBeGreaterThan(3);
  });

  it('handles a single real match, excludes cancelled matches and does not invent questions', () => {
    expect(generateQuizQuestions([match(1)])).toHaveLength(8);
    expect(generateQuizQuestions([])).toEqual([]);
    expect(generateQuizQuestions([match(1, { status: 'CANCELLED' })])).toEqual([]);
  });
});

describe('quiz closing rules', () => {
  const now = new Date('2030-10-12T12:00:00Z');
  it('closes at the first match even if that match was not selected', () => {
    const matches = Array.from({ length: 12 }, (_, i) =>
      match(i, { kickoff: new Date('2030-10-12T18:00:00Z') }),
    );
    matches[0].homeTeam = 'FC Barcelona';
    for (let i = 1; i < 11; i++) matches[i].homeTeam = 'Arsenal FC';
    matches[11].kickoff = now;
    matches[11].externalId = 1000;
    matches[11].homeTeam = 'Small club';
    expect(selectQuizMatches(matches).find((m) => m.id === 'm11')).toBeUndefined();
    const deadline = quizDeadline(matches, new Date('2030-10-13T18:00:00Z'));
    expect(mustLockQuiz(null, matches, deadline.closesAt, now)).toBe(true);
  });

  it('closes early if a match starts and never reopens a locked event', () => {
    const future = new Date('2030-10-13T18:00:00Z');
    expect(mustLockQuiz(null, [match(1, { status: 'LIVE', kickoff: future })], future, now)).toBe(
      true,
    );
    expect(
      mustLockQuiz(now, [match(1, { status: 'POSTPONED', kickoff: future })], future, now),
    ).toBe(true);
    expect(mustLockQuiz(null, [match(1, { kickoff: future })], future, now)).toBe(false);
  });

  it('marks midnight placeholders unconfirmed and respects rescheduling before closure', () => {
    const provisional = match(1, { kickoff: new Date('2030-10-13T00:00:00Z') });
    expect(quizDeadline([provisional], now).kickoffConfirmed).toBe(false);
    provisional.kickoff = new Date('2030-10-13T18:30:00Z');
    expect(quizDeadline([provisional], now)).toEqual({
      closesAt: provisional.kickoff,
      kickoffConfirmed: true,
    });
  });
});

describe('automatic quiz resolution', () => {
  it.each(QUESTION_TYPES)(
    'does not score %s while LIVE, postponed or missing a final score',
    (type) => {
      for (const status of ['LIVE', 'POSTPONED', 'SCHEDULED'] as const) {
        expect(
          resolveQuizQuestion(type, match(1, { status, homeScore: 3, awayScore: 0 })).resolution,
        ).toBe('PENDING');
      }
      expect(
        resolveQuizQuestion(type, match(1, { status: 'FINISHED', homeScore: 3 })).resolution,
      ).toBe('PENDING');
      expect(resolveQuizQuestion(type, match(1, { status: 'CANCELLED' }))).toEqual({
        resolution: 'VOID',
        correctOption: null,
      });
    },
  );

  it.each([
    ['WINNER', 0, 0, 'DRAW'],
    ['WINNER', 0, 2, 'AWAY'],
    ['WINNER', 2, 0, 'HOME'],
    ['BOTH_SCORE', 1, 1, 'YES'],
    ['BOTH_SCORE', 0, 1, 'NO'],
    ['OVER_2_5', 1, 1, 'NO'],
    ['OVER_2_5', 1, 2, 'YES'],
    ['HOME_CLEAN_SHEET', 0, 0, 'YES'],
    ['HOME_CLEAN_SHEET', 3, 1, 'NO'],
    ['AWAY_CLEAN_SHEET', 0, 2, 'YES'],
    ['HOME_TWO_PLUS', 2, 0, 'YES'],
    ['AWAY_TWO_PLUS', 0, 1, 'NO'],
    ['WIN_BY_TWO_PLUS', 1, 3, 'YES'],
    ['WIN_BY_TWO_PLUS', 2, 1, 'NO'],
  ])('%s with %s-%s gives %s', (type, home, away, expected) => {
    const resolution = resolveQuizQuestion(
      type as QuizQuestionType,
      match(1, { status: 'FINISHED', homeScore: home as number, awayScore: away as number }),
    );
    expect(resolution).toEqual({ resolution: 'RESOLVED', correctOption: expected });
  });
});
