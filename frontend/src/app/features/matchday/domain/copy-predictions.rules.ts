import { CopyResult, CopySource, CopySkipReason } from '../../../core/models/prediction.model';
import { ScoringMode } from '../../../core/models/group.model';
import { t } from '../../../core/i18n/translate';

export interface CopyMessage {
  text: string;
  /** true si hay algo que el usuario debe leer con calma (partidos sin copiar, comodines que no pasan): se muestra en un dialogo en vez de un aviso fugaz. */
  needsAttention: boolean;
}

/** Una frase por motivo, solo para los que de verdad han ocurrido. */
function skipNote(reason: CopySkipReason, count: number): string {
  switch (reason) {
    case 'LOCKED':
      return t('copyRules.skipLocked', { count });
    case 'WILDCARD_UNAVAILABLE':
      return t('copyRules.skipWildcard', { count });
    case 'FAILED':
      return t('copyRules.skipFailed', { count });
  }
}

/** Texto para el usuario tras copiar los pronosticos de `sourceName` (logica pura: no depende de Angular). */
export function copyResultMessage(sourceName: string, result: CopyResult): CopyMessage {
  const copied = result.copied.length;
  const notes: string[] = [];

  const reasons: CopySkipReason[] = ['LOCKED', 'WILDCARD_UNAVAILABLE', 'FAILED'];
  for (const reason of reasons) {
    const count = result.skipped.filter((s) => s.reason === reason).length;
    if (count > 0) notes.push(skipNote(reason, count));
  }
  const dropped = result.wildcardsDropped.length;
  if (dropped > 0) notes.push(t('copyRules.dropped', { count: dropped }));

  if (copied === 0 && notes.length === 0) {
    return { text: t('copyRules.nothing', { name: sourceName }), needsAttention: false };
  }

  const head = copied === 0 ? t('copyRules.none', { name: sourceName }) : t('copyRules.copied', { count: copied, name: sourceName });
  return { text: [head, ...notes].join(' '), needsAttention: notes.length > 0 };
}

/** Linea secundaria de cada grupo en el selector: cuantos partidos se copiarian o, si no se puede, por que. */
export function copySourceSubtitle(source: CopySource, targetMode: ScoringMode): string {
  if (source.unavailable === 'DIFFERENT_MODE') {
    return t('copyRules.differentMode', { source: modeName(source.scoringMode), target: modeName(targetMode) });
  }
  if (source.unavailable === 'ALL_STARTED') {
    return t('copyRules.allStarted');
  }
  return t('copyRules.matches', { count: source.copyableCount });
}

function modeName(mode: ScoringMode): string {
  return mode === 'ONE_X_TWO' ? '1X2' : t('copyRules.modeExact');
}
