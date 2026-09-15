import { Match } from '../../../core/models/matchday.model';
import {
  PredictionSelection,
  exactScorePoints,
  isMatchPredictable,
  isPredictionHit,
  matchAccentTone,
  pointsForPrediction,
  predictionLabel,
} from './prediction-rules';

const match = (overrides: Partial<Match> = {}): Match => ({
  id: 'match-1',
  matchdayId: 'matchday-1',
  homeTeam: 'Local',
  awayTeam: 'Visitante',
  homeTeamLogo: null,
  awayTeamLogo: null,
  kickoff: '2026-09-12T18:00:00.000Z',
  status: 'FINISHED',
  homeScore: 2,
  awayScore: 1,
  result: 'HOME',
  ...overrides,
});

const selection = (overrides: Partial<PredictionSelection> = {}): PredictionSelection => ({
  choice: 'HOME',
  doubleChanceOption: null,
  predictedHomeScore: null,
  predictedAwayScore: null,
  pointsEarned: null,
  ...overrides,
});

describe('prediction rules', () => {
  it('solo permite pronosticar partidos programados antes de su inicio', () => {
    const now = new Date('2026-09-11T18:00:00.000Z');
    expect(isMatchPredictable(match({ status: 'SCHEDULED' }), now)).toBeTrue();
    expect(isMatchPredictable(match({ status: 'LIVE' }), now)).toBeFalse();
    expect(isMatchPredictable(match({ status: 'SCHEDULED', kickoff: now.toISOString() }), now)).toBeFalse();
  });

  it('representa 1X2, doble oportunidad y resultado exacto sin depender de la vista', () => {
    expect(predictionLabel(selection({ choice: 'DRAW' }), false)).toBe('X');
    expect(predictionLabel(selection({ choice: null, doubleChanceOption: 'DRAW_OR_AWAY' }), false)).toBe('X2');
    expect(predictionLabel(selection({ predictedHomeScore: 3, predictedAwayScore: 2 }), true)).toBe('3-2');
  });

  it('aplica las reglas reales de 5/2/0 para resultado exacto', () => {
    expect(exactScorePoints(match(), selection({ predictedHomeScore: 2, predictedAwayScore: 1 }))).toBe(5);
    expect(exactScorePoints(match(), selection({ predictedHomeScore: 3, predictedAwayScore: 0 }))).toBe(2);
    expect(exactScorePoints(match(), selection({ predictedHomeScore: 0, predictedAwayScore: 1 }))).toBe(0);
  });

  it('cubre ambos signos de la doble oportunidad y respeta puntos persistidos', () => {
    const doubleChance = selection({ choice: null, doubleChanceOption: 'HOME_OR_DRAW' });
    expect(isPredictionHit(match({ result: 'DRAW' }), doubleChance, false)).toBeTrue();
    expect(isPredictionHit(match({ result: 'AWAY' }), doubleChance, false)).toBeFalse();
    expect(pointsForPrediction(match(), selection({ pointsEarned: 9 }), false)).toBe(9);
  });

  it('el comodin de remontada en resultado exacto (doublePointsWildcard) duplica 5/2 a 10/4', () => {
    const exact = selection({ predictedHomeScore: 2, predictedAwayScore: 1, doublePointsWildcard: true });
    expect(exactScorePoints(match(), exact)).toBe(10);
    expect(predictionLabel(exact, true)).toBe('2-1 (x2)');
    expect(matchAccentTone(match(), exact, true)).toBe('hit');

    const partial = selection({ predictedHomeScore: 3, predictedAwayScore: 0, doublePointsWildcard: true });
    expect(exactScorePoints(match(), partial)).toBe(4);
    expect(matchAccentTone(match(), partial, true)).toBe('partial');

    const miss = selection({ predictedHomeScore: 0, predictedAwayScore: 1, doublePointsWildcard: true });
    expect(exactScorePoints(match(), miss)).toBe(0);
    expect(matchAccentTone(match(), miss, true)).toBe('miss');
  });
});
