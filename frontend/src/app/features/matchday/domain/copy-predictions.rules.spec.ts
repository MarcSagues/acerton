import { CopyResult, CopySource, Prediction } from '../../../core/models/prediction.model';
import { copyResultMessage, copySourceSubtitle } from './copy-predictions.rules';

const prediction = (matchId: string): Prediction => ({
  id: `p-${matchId}`,
  userId: 'u1',
  groupId: 'g1',
  matchId,
  choice: 'HOME',
  doubleChanceOption: null,
  predictedHomeScore: null,
  predictedAwayScore: null,
  doublePointsWildcard: false,
  pointsEarned: null,
  submittedAt: '2026-10-04T10:00:00.000Z',
});

const result = (overrides: Partial<CopyResult> = {}): CopyResult => ({
  copied: [],
  skipped: [],
  wildcardsDropped: [],
  ...overrides,
});

describe('copyResultMessage', () => {
  it('copia limpia: aviso fugaz, en singular o plural, recordando que se puede cambiar', () => {
    expect(copyResultMessage('Amigos', result({ copied: [prediction('m1')] }))).toEqual({
      text: 'Copiado 1 pronóstico de «Amigos». Puedes cambiar los que quieras.',
      needsAttention: false,
    });
    expect(
      copyResultMessage('Amigos', result({ copied: [prediction('m1'), prediction('m2')] })),
    ).toEqual({
      text: 'Copiados 2 pronósticos de «Amigos». Puedes cambiar los que quieras.',
      needsAttention: false,
    });
  });

  it('sin nada en el origen: lo dice sin pedir atencion', () => {
    expect(copyResultMessage('Amigos', result())).toEqual({
      text: 'No hay nada que copiar de «Amigos».',
      needsAttention: false,
    });
  });

  it('explica cada motivo de partido omitido, solo los que han ocurrido, y pide atencion', () => {
    const message = copyResultMessage(
      'Amigos',
      result({
        copied: [prediction('m1')],
        skipped: [
          { matchId: 'm2', reason: 'LOCKED' },
          { matchId: 'm3', reason: 'LOCKED' },
          { matchId: 'm4', reason: 'WILDCARD_UNAVAILABLE' },
        ],
      }),
    );
    expect(message.needsAttention).toBe(true);
    expect(message.text).toContain('Copiado 1 pronóstico de «Amigos».');
    expect(message.text).toContain('2 partidos no se copiaron porque ya habían empezado.');
    expect(message.text).toContain('1 partido con comodín no se copió');
    expect(message.text).not.toContain('no se pudieron copiar');
  });

  it('avisa de los partidos copiados sin su comodin', () => {
    const message = copyResultMessage(
      'Amigos',
      result({ copied: [prediction('m1')], wildcardsDropped: ['m1'] }),
    );
    expect(message.needsAttention).toBe(true);
    expect(message.text).toContain('1 partido se copió sin su comodín');
  });

  it('si no se ha copiado ninguno pero habia algo que copiar, no dice que se copio', () => {
    const message = copyResultMessage(
      'Amigos',
      result({ skipped: [{ matchId: 'm1', reason: 'FAILED' }] }),
    );
    expect(message.text.startsWith('No se ha copiado ningún pronóstico de «Amigos».')).toBe(true);
    expect(message.text).toContain('1 partido no se pudo copiar');
    expect(message.needsAttention).toBe(true);
  });
});

describe('copySourceSubtitle', () => {
  const source = (overrides: Partial<CopySource> = {}): CopySource => ({
    groupId: 'g2',
    name: 'Trabajo',
    scoringMode: 'ONE_X_TWO',
    copyableCount: 3,
    unavailable: null,
    ...overrides,
  });

  it('cuenta los partidos copiables en singular/plural', () => {
    expect(copySourceSubtitle(source({ copyableCount: 1 }), 'ONE_X_TWO')).toBe('1 partido');
    expect(copySourceSubtitle(source(), 'ONE_X_TWO')).toBe('3 partidos');
  });

  it('si es de otro modo, lo dice nombrando los dos modos, en los dos sentidos', () => {
    expect(
      copySourceSubtitle(source({ unavailable: 'DIFFERENT_MODE' }), 'EXACT_SCORE'),
    ).toBe('Juega a 1X2 y este a resultado exacto: no se puede copiar entre modos');
    expect(
      copySourceSubtitle(
        source({ scoringMode: 'EXACT_SCORE', unavailable: 'DIFFERENT_MODE' }),
        'ONE_X_TWO',
      ),
    ).toBe('Juega a resultado exacto y este a 1X2: no se puede copiar entre modos');
  });

  it('si todos sus partidos ya empezaron, lo dice', () => {
    expect(
      copySourceSubtitle(source({ unavailable: 'ALL_STARTED', copyableCount: 0 }), 'ONE_X_TWO'),
    ).toMatch(/ya han empezado/);
  });
});
