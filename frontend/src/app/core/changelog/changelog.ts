/**
 * Historial de versiones de la app. Es lo que ve el usuario en el pop-up de
 * novedades la primera vez que abre una versión nueva (ver WhatsNewService).
 *
 * Cómo mantenerlo:
 * - La entrada de arriba es la versión en curso y su `version` tiene que ser la
 *   misma que MARKETING_VERSION del proyecto iOS (frontend/ios/App/App.xcodeproj/
 *   project.pbxproj): el pop-up sale al coincidir la versión instalada con una
 *   entrada de aquí. Lo comprueba `scripts/check-changelog.mjs` en CI.
 * - Cada cambio visible para el usuario añade una línea a la entrada en curso;
 *   al subir de versión se crea una entrada nueva ARRIBA (la anterior no se toca).
 * - Cada cambio va en español e inglés. Texto corto y en positivo, pensado para
 *   quien juega, no para quien programa ("Puedes copiar...", no "Endpoint nuevo...").
 * - `date` es la de la publicación (AAAA-MM-DD).
 */
import type { Lang } from '../i18n/translate';

export interface ChangelogChange {
  es: string;
  en: string;
  /** Opcionales: si falta el del idioma de la app, el pop-up usa el ingles (ver changeText). */
  ca?: string;
  fr?: string;
  it?: string;
  de?: string;
}

/** Texto de un cambio en un idioma, o en ingles si todavia no esta traducido a ese. */
export function changeText(change: ChangelogChange, lang: Lang): string {
  return change[lang] ?? change.en;
}

export interface ChangelogEntry {
  /** MAYOR.MENOR.PARCHE, igual que la versión de la app en las tiendas. */
  version: string;
  date: string;
  changes: readonly ChangelogChange[];
}

/** De la más nueva a la más antigua. */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: '1.0.3',
    date: '2026-10-05',
    changes: [
      {
        es: 'Al escribir un resultado exacto, la pantalla sube para que el último partido no quede tapado por el teclado.',
        en: "When you type an exact score, the screen scrolls up so the last match isn't hidden behind the keyboard.",
      },
      {
        es: 'Arreglo: el aviso de subida de nivel sale una sola vez.',
        en: 'Fix: the level-up notice now appears only once.',
      },
      {
        es: 'Las imágenes para compartir usan el nombre corto de los equipos ("Barça", "Atleti") y ya no se cortan.',
        en: 'Share images use short team names ("Barça", "Atleti") so they no longer get cut off.',
      },
      {
        es: 'Tabla: en Semanal puedes elegir una jornada (J1, J2…) de cada liga para ver lo que se puntuó en ella.',
        en: 'Table: in Weekly you can pick a matchday (MD1, MD2…) of each league to see what was scored in it.',
      },
      {
        es: 'Los partidos sin hora confirmada muestran «Hora por confirmar» en vez de las 2:00, y la hora se actualiza sola en cuanto se confirma.',
        en: 'Matches without a confirmed time now show "Time to be confirmed" instead of 2:00 AM, and the time updates by itself once it is confirmed.',
      },
      {
        es: 'Arreglo: el contador de insignias cuenta las distintas, no las repetidas en cada grupo.',
        en: 'Fix: the badge counter now counts distinct badges, not the same one repeated in every group.',
      },
    ],
  },
  {
    version: '1.0.2',
    date: '2026-10-05',
    changes: [
      {
        es: 'Ya puedes usar la app en inglés: elige el idioma en Perfil > Apariencia.',
        en: 'You can now use the app in English: choose the language in Profile > Appearance.',
      },
      {
        es: 'Copia tus pronósticos de otro grupo con un toque (entre grupos con el mismo modo de juego) y cámbialos después si quieres.',
        en: 'Copy your predictions from another group with one tap (between groups with the same game mode) and change them afterwards if you like.',
      },
      {
        es: 'La jornada más próxima siempre está abierta para pronosticar.',
        en: 'The nearest matchday is always open for predictions.',
      },
      {
        es: 'Los administradores pueden cambiar el nombre del grupo.',
        en: 'Group administrators can now rename the group.',
      },
      {
        es: 'Las pestañas cambian al instante y Grupos y Tabla cargan más rápido.',
        en: 'Tabs switch instantly, and Groups and Table load faster.',
      },
      {
        es: 'Perfil: trofeos e insignias en una cuadrícula más cómoda, y arreglos en la pantalla de nivel.',
        en: 'Profile: trophies and badges in a more comfortable grid, plus fixes on the level screen.',
      },
      {
        es: 'Arreglo: las insignias con el progreso ya completo se conceden aunque no se hubieran iluminado.',
        en: 'Fix: badges whose progress was already complete are now awarded even if they had not lit up.',
      },
      {
        es: 'Novedad: este aviso. La primera vez que abras una versión nueva verás aquí lo que ha cambiado.',
        en: "New: this notice. The first time you open a new version, you'll see here what has changed.",
      },
    ],
  },
];
