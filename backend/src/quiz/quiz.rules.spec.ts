import { CompetitionCode, Match, QuizQuestionType } from '@prisma/client';
import {
  generateMixedQuizQuestions,
  matchInterest,
  mustLockQuiz,
  planMixedQuiz,
  openQuizWindow,
  QUESTION_TYPES,
  QUIZ_QUESTION_COUNT,
  QuizCandidate,
  questionTarget,
  quizDeadline,
  resolveMixedQuestion,
  resolveQuizQuestion,
  windowCompetitions,
} from './quiz.rules';

function match(id: number, overrides: Partial<Match> = {}): Match {
  return {
    id: `m${id}`,
    externalId: id,
    matchdayId: 'round',
    homeTeam: `Club ${id}`,
    awayTeam: 'Rival',
    homeTeamShort: null,
    awayTeamShort: null,
    homeTeamLogo: null,
    awayTeamLogo: null,
    kickoff: new Date(`2030-10-12T${String(10 + (id % 10)).padStart(2, '0')}:00:00Z`),
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    htHomeScore: null,
    htAwayScore: null,
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

function candidate(
  id: number,
  competitionCode: CompetitionCode,
  homeTeam: string,
  awayTeam: string,
  overrides: Partial<Match> = {},
): QuizCandidate {
  return { ...match(id, { homeTeam, awayTeam, ...overrides }), competitionCode };
}

/** Un fin de semana tipico: varias ligas, algun gran partido y muchos partidos sin grandes. */
function weekend(): QuizCandidate[] {
  const leagues: CompetitionCode[] = [
    'LA_LIGA',
    'PREMIER_LEAGUE',
    'SERIE_A',
    'BUNDESLIGA',
    'LIGUE_1',
  ];
  const fillers = leagues.flatMap((league, l) =>
    Array.from({ length: 8 }, (_, i) =>
      candidate(100 + l * 10 + i, league, `Club ${league} ${i}`, `Rival ${league} ${i}`),
    ),
  );
  return [
    ...fillers,
    candidate(1, 'LA_LIGA', 'Real Madrid CF', 'FC Barcelona'),
    candidate(2, 'PREMIER_LEAGUE', 'Arsenal FC', 'Chelsea FC'),
    candidate(3, 'SERIE_A', 'AS Roma', 'SS Lazio'),
    candidate(4, 'BUNDESLIGA', 'Borussia Dortmund', 'Club Bundesliga'),
    candidate(5, 'LA_LIGA', 'Sevilla FC', 'Getafe CF'),
  ];
}

describe('mixed quiz selection and generation', () => {
  it('makes 20 questions mixing leagues, every league present, more questions for big matches', () => {
    const plan = planMixedQuiz(weekend());
    expect(plan.reduce((sum, item) => sum + item.count, 0)).toBe(QUIZ_QUESTION_COUNT);
    expect(new Set(plan.map((item) => item.match.competitionCode))).toEqual(
      new Set(['LA_LIGA', 'PREMIER_LEAGUE', 'SERIE_A', 'BUNDESLIGA', 'LIGUE_1']),
    );
    const count = (id: string) => plan.find((item) => item.match.id === id)?.count ?? 0;
    expect(plan[0].match.id).toBe('m1'); // el Clasico, el primero
    expect(count('m1')).toBe(4);
    expect(count('m2')).toBe(4);
    expect(count('m3')).toBe(2);
    expect(count('m4')).toBe(2);
    // Ligue 1 sin grandes: entra su mejor partido, con una pregunta.
    expect(plan.filter((item) => item.match.competitionCode === 'LIGUE_1')).toHaveLength(1);
  });

  it('is stable whatever the input order and gives different question types per match', () => {
    const questions = generateMixedQuizQuestions(weekend());
    expect(generateMixedQuizQuestions(weekend().reverse())).toEqual(questions);
    expect(questions).toHaveLength(20);
    expect(questions.map((q) => q.order)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(new Set(questions.map((q) => `${q.matchId}:${q.type}`)).size).toBe(20);
    // Las preguntas de un mismo partido van juntas.
    const seen = new Set<string>();
    questions.forEach((q, i) => {
      if (seen.has(q.matchId)) expect(questions[i - 1].matchId).toBe(q.matchId);
      seen.add(q.matchId);
    });
  });

  it('mixes many question types instead of repeating the winner one', () => {
    const questions = generateMixedQuizQuestions(weekend());
    const types = questions.map((q) => q.type);
    expect(new Set(types).size).toBeGreaterThanOrEqual(14);
    for (const type of QUESTION_TYPES) {
      expect(types.filter((t) => t === type).length).toBeLessThanOrEqual(2);
    }
    // Cada pregunta trae las opciones de su tipo.
    const total = questions.find((q) => q.type === 'TOTAL_GOALS');
    expect(total?.options).toEqual(['GOALS_0_1', 'GOALS_2_3', 'GOALS_4_PLUS']);
    const halfTime = questions.find((q) => q.type === 'HALF_TIME_RESULT');
    expect(halfTime?.options).toEqual(['HOME', 'DRAW', 'AWAY']);
  });

  it('picks the biggest clubs when there are no big matches, and keeps Madrid aliases apart', () => {
    const plan = planMixedQuiz([
      candidate(1, 'LA_LIGA', 'Rayo Vallecano de Madrid', 'Getafe CF'),
      candidate(2, 'LA_LIGA', 'Club 2', 'Real Madrid CF'),
      candidate(3, 'SERIE_A', 'Club 3', 'Rival 3'),
      candidate(4, 'SERIE_A', 'Juventus FC', 'Rival 4'),
    ]);
    expect(plan[0].match.id).toBe('m2');
    expect(plan[1].match.id).toBe('m4');
  });

  it('fills 20 questions from few matches, excludes cancelled ones and never invents questions', () => {
    const midweek = Array.from({ length: 3 }, (_, i) =>
      candidate(i, 'CHAMPIONS_LEAGUE', `Club ${i}`, 'Rival'),
    );
    expect(generateMixedQuizQuestions(midweek)).toHaveLength(20);
    expect(generateMixedQuizQuestions([candidate(1, 'LA_LIGA', 'A', 'B')])).toHaveLength(
      QUESTION_TYPES.length,
    );
    expect(generateMixedQuizQuestions([])).toEqual([]);
    expect(
      generateMixedQuizQuestions([candidate(1, 'LA_LIGA', 'A', 'B', { status: 'CANCELLED' })]),
    ).toEqual([]);
  });

  it('scores big matches above single big clubs and Champions nights slightly higher', () => {
    const clasico = candidate(1, 'LA_LIGA', 'FC Barcelona', 'Real Madrid CF');
    const bayern = candidate(2, 'BUNDESLIGA', 'FC Bayern München', 'Club');
    const bayernCl = candidate(3, 'CHAMPIONS_LEAGUE', 'FC Bayern München', 'Club');
    expect(matchInterest(clasico)).toBeGreaterThan(matchInterest(bayern));
    expect(matchInterest(bayernCl)).toBe(matchInterest(bayern) + 1);
    expect(questionTarget(clasico)).toBe(4);
    expect(questionTarget(bayern)).toBe(2);
    expect(questionTarget(candidate(4, 'LIGUE_1', 'Club', 'Rival'))).toBe(1);
  });
});

describe('mixed quiz dates (Madrid time)', () => {
  const at = (iso: string) => openQuizWindow(new Date(iso));

  it('the league quiz is played Tuesday to Friday 18:00, with the league games from Friday to Tuesday', () => {
    // Jueves 15 de octubre de 2026 (verano, UTC+2).
    expect(at('2026-10-15T12:00:00Z')).toEqual({
      key: '2026-10-16-WEEKEND',
      kind: 'WEEKEND',
      opensAt: new Date('2026-10-13T16:00:00Z'),
      start: new Date('2026-10-16T16:00:00Z'),
      end: new Date('2026-10-20T16:00:00Z'),
    });
    expect(windowCompetitions('WEEKEND')).not.toContain('CHAMPIONS_LEAGUE');
    expect(windowCompetitions('WEEKEND')).toContain('LA_LIGA');
  });

  it('the Champions quiz is played Friday to Tuesday 18:00, with the Champions games from Tuesday to Friday', () => {
    const window = at('2026-10-16T16:00:00Z'); // justo en el corte del viernes
    expect(window).toEqual({
      key: '2026-10-20-MIDWEEK',
      kind: 'MIDWEEK',
      opensAt: new Date('2026-10-16T16:00:00Z'),
      start: new Date('2026-10-20T16:00:00Z'),
      end: new Date('2026-10-23T16:00:00Z'),
    });
    expect(at('2026-10-20T15:59:59Z').key).toBe('2026-10-20-MIDWEEK');
    expect(windowCompetitions('MIDWEEK')).toEqual(['CHAMPIONS_LEAGUE']);
  });

  it('every quiz is open at least 3 days and follows the winter time change', () => {
    for (let day = 1; day <= 60; day++) {
      const window = at(new Date(Date.UTC(2026, 9, day, 9)).toISOString());
      expect(window.start.getTime() - window.opensAt.getTime()).toBeGreaterThanOrEqual(
        3 * 24 * 60 * 60 * 1000,
      );
    }
    // El 25 de octubre Madrid pasa a UTC+1: el corte sigue a las 18:00 de alli.
    const winter = at('2026-10-24T12:00:00Z');
    expect(winter.start).toEqual(new Date('2026-10-27T17:00:00Z'));
    expect(winter.end).toEqual(new Date('2026-10-30T17:00:00Z'));
  });

  it('voids a question whose game started before the quiz closed', () => {
    const closesAt = new Date('2030-10-11T16:00:00Z');
    const played = { status: 'FINISHED' as const, homeScore: 2, awayScore: 0 };
    expect(
      resolveMixedQuestion(
        'WINNER',
        match(1, { ...played, kickoff: new Date('2030-10-11T15:00:00Z') }),
        closesAt,
      ),
    ).toEqual({ resolution: 'VOID', correctOption: null });
    expect(
      resolveMixedQuestion(
        'WINNER',
        match(1, { ...played, kickoff: new Date('2030-10-11T19:00:00Z') }),
        closesAt,
      ),
    ).toEqual({ resolution: 'RESOLVED', correctOption: 'HOME' });
  });
});

describe('quiz closing rules', () => {
  const now = new Date('2030-10-12T12:00:00Z');
  it('closes at the first match it is given and locks when one has started', () => {
    const matches = Array.from({ length: 3 }, (_, i) =>
      match(i, { kickoff: new Date('2030-10-12T18:00:00Z') }),
    );
    matches[2].kickoff = now;
    const deadline = quizDeadline(matches, new Date('2030-10-13T18:00:00Z'));
    expect(deadline.closesAt).toEqual(now);
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
    // [tipo, goles local, goles visitante, descanso local, descanso visitante, correcta]
    ['HALF_TIME_RESULT', 3, 3, 0, 1, 'AWAY'],
    ['HALF_TIME_RESULT', 2, 0, 0, 0, 'DRAW'],
    ['FIRST_HALF_GOAL', 1, 0, 0, 0, 'NO'],
    ['FIRST_HALF_GOAL', 1, 0, 1, 0, 'YES'],
    ['SECOND_HALF_MORE_GOALS', 3, 1, 1, 0, 'YES'],
    ['SECOND_HALF_MORE_GOALS', 2, 0, 1, 0, 'NO'],
    ['GOAL_BOTH_HALVES', 2, 0, 1, 0, 'YES'],
    ['GOAL_BOTH_HALVES', 1, 0, 1, 0, 'NO'],
    ['COMEBACK', 2, 1, 0, 1, 'YES'],
    ['COMEBACK', 1, 1, 0, 1, 'NO'],
    ['COMEBACK', 1, 3, 1, 0, 'YES'],
  ])('%s with %s-%s (half time %s-%s) gives %s', (type, home, away, htHome, htAway, expected) => {
    const resolution = resolveQuizQuestion(
      type as QuizQuestionType,
      match(1, {
        status: 'FINISHED',
        homeScore: home as number,
        awayScore: away as number,
        htHomeScore: htHome as number,
        htAwayScore: htAway as number,
      }),
    );
    expect(resolution).toEqual({ resolution: 'RESOLVED', correctOption: expected });
  });

  it('waits for a missing half-time score and only voids it after 3 days', () => {
    const kickoff = new Date('2030-10-12T18:00:00Z');
    const finished = match(1, { status: 'FINISHED', homeScore: 2, awayScore: 1, kickoff });
    const hours = (h: number) => new Date(kickoff.getTime() + h * 60 * 60 * 1000);
    expect(resolveQuizQuestion('FIRST_HALF_GOAL', finished, hours(3))).toEqual({
      resolution: 'PENDING',
      correctOption: null,
    });
    expect(resolveQuizQuestion('COMEBACK', finished, hours(71)).resolution).toBe('PENDING');
    expect(resolveQuizQuestion('COMEBACK', finished, hours(73)).resolution).toBe('VOID');
    // Las que no dependen del descanso se resuelven igual.
    expect(resolveQuizQuestion('DRAW', finished, hours(3)).resolution).toBe('RESOLVED');
  });

  it.each([
    ['WINNER', 0, 0, 'DRAW'],
    ['DRAW', 1, 1, 'YES'],
    ['DRAW', 2, 1, 'NO'],
    ['TOTAL_GOALS', 1, 0, 'GOALS_0_1'],
    ['TOTAL_GOALS', 2, 1, 'GOALS_2_3'],
    ['TOTAL_GOALS', 3, 1, 'GOALS_4_PLUS'],
    ['ODD_GOALS', 2, 1, 'YES'],
    ['ODD_GOALS', 0, 0, 'NO'],
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
