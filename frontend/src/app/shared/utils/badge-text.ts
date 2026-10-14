import { Pipe, PipeTransform } from '@angular/core';
import { TranslationKey, t } from '../../core/i18n/translate';

interface BadgeLike {
  code: string;
  name: string;
  description: string;
}

/**
 * Textos de las insignias por codigo. El backend guarda nombre y descripcion en
 * espanol (BADGE_CATALOG); aqui se traducen en el cliente, y una insignia con un
 * codigo que este catalogo no conozca (una nueva aun sin traducir) se muestra
 * con el texto que mande el backend.
 */
const BADGE_TEXT_KEYS: Record<string, { name: TranslationKey; description: TranslationKey }> = {
  FIRST_MATCHDAY_PLAYED: { name: 'badges.firstMatchdayPlayed', description: 'badges.firstMatchdayPlayedDesc' },
  STREAK_5: { name: 'badges.streak5', description: 'badges.streak5Desc' },
  STREAK_10: { name: 'badges.streak10', description: 'badges.streak10Desc' },
  HOT_STREAK_5: { name: 'badges.hotStreak5', description: 'badges.hotStreak5Desc' },
  MATCHDAY_TOP_1: { name: 'badges.matchdayTop1', description: 'badges.matchdayTop1Desc' },
  STREAK_25: { name: 'badges.streak25', description: 'badges.streak25Desc' },
  PREDICTIONS_100: { name: 'badges.predictions100', description: 'badges.predictions100Desc' },
  ONE_X_TWO_HITS_25: { name: 'badges.oneXTwoHits25', description: 'badges.oneXTwoHits25Desc' },
  ONE_X_TWO_HITS_100: { name: 'badges.oneXTwoHits100', description: 'badges.oneXTwoHits100Desc' },
  EXACT_SCORE_HIT_1: { name: 'badges.exactScoreHit1', description: 'badges.exactScoreHit1Desc' },
  EXACT_SCORE_HITS_10: { name: 'badges.exactScoreHits10', description: 'badges.exactScoreHits10Desc' },
  HOT_STREAK_10: { name: 'badges.hotStreak10', description: 'badges.hotStreak10Desc' },
  PREDICTIONS_500: { name: 'badges.predictions500', description: 'badges.predictions500Desc' },
  PERFECT_MATCHDAY: { name: 'badges.perfectMatchday', description: 'badges.perfectMatchdayDesc' },
  WILDCARD_HITS_5: { name: 'badges.wildcardHits5', description: 'badges.wildcardHits5Desc' },
  GROUPS_JOINED_3: { name: 'badges.groupsJoined3', description: 'badges.groupsJoined3Desc' },
  DRAW_HITS_10: { name: 'badges.drawHits10', description: 'badges.drawHits10Desc' },
  COMPETITIONS_3: { name: 'badges.competitions3', description: 'badges.competitions3Desc' },
  GROUP_FOUNDER: { name: 'badges.groupFounder', description: 'badges.groupFounderDesc' },
  PODIUM_5: { name: 'badges.podium5', description: 'badges.podium5Desc' },
};

export function badgeName(badge: BadgeLike): string {
  const keys = BADGE_TEXT_KEYS[badge.code];
  return keys ? t(keys.name) : badge.name;
}

export function badgeDescription(badge: BadgeLike): string {
  const keys = BADGE_TEXT_KEYS[badge.code];
  return keys ? t(keys.description) : badge.description;
}

@Pipe({ name: 'badgeName', standalone: true })
export class BadgeNamePipe implements PipeTransform {
  transform(badge: BadgeLike): string {
    return badgeName(badge);
  }
}

@Pipe({ name: 'badgeDescription', standalone: true })
export class BadgeDescriptionPipe implements PipeTransform {
  transform(badge: BadgeLike): string {
    return badgeDescription(badge);
  }
}
