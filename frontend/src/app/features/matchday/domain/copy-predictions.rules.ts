import { CopyResult, CopySource, CopySkipReason } from '../../../core/models/prediction.model';
import { ScoringMode } from '../../../core/models/group.model';

export interface CopyMessage {
  text: string;
  /** true si hay algo que el usuario debe leer con calma (partidos sin copiar, comodines que no pasan): se muestra en un dialogo en vez de un aviso fugaz. */
  needsAttention: boolean;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Una frase por motivo, solo para los que de verdad han ocurrido. */
function skipNote(reason: CopySkipReason, count: number): string {
  switch (reason) {
    case 'LOCKED':
      return `${plural(count, 'partido no se copió porque ya había empezado', 'partidos no se copiaron porque ya habían empezado')}.`;
    case 'WILDCARD_UNAVAILABLE':
      return `${plural(count, 'partido con comodín no se copió', 'partidos con comodín no se copiaron')}: no te quedan comodines en este grupo. Elígelo a mano.`;
    case 'FAILED':
      return `${plural(count, 'partido no se pudo copiar', 'partidos no se pudieron copiar')}. Inténtalo de nuevo o elígelo a mano.`;
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
  if (dropped > 0) {
    notes.push(
      `${plural(dropped, 'partido se copió sin su comodín', 'partidos se copiaron sin su comodín')}: no se puede aplicar en este grupo.`,
    );
  }

  if (copied === 0 && notes.length === 0) {
    return { text: `No hay nada que copiar de «${sourceName}».`, needsAttention: false };
  }

  const head =
    copied === 0
      ? `No se ha copiado ningún pronóstico de «${sourceName}».`
      : `${copied === 1 ? 'Copiado 1 pronóstico' : `Copiados ${copied} pronósticos`} de «${sourceName}». Puedes cambiar los que quieras.`;
  return { text: [head, ...notes].join(' '), needsAttention: notes.length > 0 };
}

const MODE_NAME: Record<ScoringMode, string> = { ONE_X_TWO: '1X2', EXACT_SCORE: 'resultado exacto' };

/** Linea secundaria de cada grupo en el selector: cuantos partidos se copiarian o, si no se puede, por que. */
export function copySourceSubtitle(source: CopySource, targetMode: ScoringMode): string {
  if (source.unavailable === 'DIFFERENT_MODE') {
    return `Juega a ${MODE_NAME[source.scoringMode]} y este a ${MODE_NAME[targetMode]}: no se puede copiar entre modos`;
  }
  if (source.unavailable === 'ALL_STARTED') {
    return 'Los partidos que marcaste ahí ya han empezado';
  }
  return plural(source.copyableCount, 'partido', 'partidos');
}
