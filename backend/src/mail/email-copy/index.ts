import type { Locale } from '../../common/i18n/locale';
import { copy as ca } from './ca';
import { copy as de } from './de';
import { copy as en } from './en';
import { copy as es } from './es';
import { copy as fr } from './fr';
import { copy as it } from './it';
import type { LocaleEmailCopy } from './types';

export type { EmailCopy, EmailFooterCopy, LocaleEmailCopy } from './types';

/** Textos de los correos en cada idioma; el espanol es el original. */
export const EMAIL_COPY: Record<Locale, LocaleEmailCopy> = { es, en, ca, fr, it, de };
