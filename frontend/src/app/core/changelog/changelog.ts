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
        es: 'En Tabla, una gráfica de líneas enseña cómo vais tú y los primeros del grupo jornada a jornada, en Semanal y en Total. Toca «Tú» para ver solo la tuya.',
        en: 'In Table, a line chart shows how you and the group leaders are doing matchday by matchday, in Weekly and Total. Tap "You" to see just yours.',
        ca: 'A Taula, una gràfica de línies mostra com aneu tu i els primers del grup jornada a jornada, a Setmanal i a Total. Toca «Tu» per veure només la teva.',
        fr: 'Dans Classement, un graphique en lignes montre où vous en êtes, toi et les premiers du groupe, journée après journée, en Hebdo et en Total. Touche « Toi » pour ne voir que la tienne.',
        it: 'In Classifica, un grafico a linee mostra come andate tu e i primi del gruppo giornata dopo giornata, in Settimanale e in Totale. Tocca «Tu» per vedere solo la tua.',
        de: 'In der Tabelle zeigt ein Liniendiagramm Spieltag für Spieltag, wie es dir und der Spitze der Gruppe läuft, in Woche und Gesamt. Tippe auf „Du“, um nur deine zu sehen.',
      },
      {
        es: 'En los grupos de resultado exacto, Tabla corona al rey del marcador exacto: quién ha clavado más marcadores en la jornada y en total.',
        en: 'In exact-score groups, Table crowns the exact score king: who has nailed the most scores in the matchday and overall.',
        ca: 'Als grups de resultat exacte, Taula corona el rei del marcador exacte: qui ha clavat més marcadors a la jornada i en total.',
        fr: 'Dans les groupes en score exact, Classement couronne le roi du score exact : qui a trouvé le plus de scores sur la journée et au total.',
        it: 'Nei gruppi a risultato esatto, Classifica incorona il re del risultato esatto: chi ne ha azzeccati di più nella giornata e in totale.',
        de: 'In Gruppen mit exaktem Ergebnis kürt die Tabelle den König der exakten Ergebnisse: wer am Spieltag und insgesamt die meisten getroffen hat.',
      },
      {
        es: 'Ya puedes usar la app en catalán, francés, italiano y alemán: elige el idioma en Perfil > Apariencia.',
        en: 'You can now use the app in Catalan, French, Italian and German: choose the language in Profile > Appearance.',
        ca: 'Ja pots fer servir l’app en català, francès, italià i alemany: tria l’idioma a Perfil > Aparença.',
        fr: 'Tu peux maintenant utiliser l’appli en catalan, français, italien et allemand : choisis la langue dans Profil > Apparence.',
        it: 'Ora puoi usare l’app in catalano, francese, italiano e tedesco: scegli la lingua in Profilo > Aspetto.',
        de: 'Du kannst die App jetzt auf Katalanisch, Französisch, Italienisch und Deutsch nutzen: Wähle die Sprache unter Profil > Darstellung.',
      },
      {
        es: 'Al escribir un resultado exacto, la pantalla sube para que el último partido no quede tapado por el teclado.',
        en: "When you type an exact score, the screen scrolls up so the last match isn't hidden behind the keyboard.",
        ca: 'En escriure un resultat exacte, la pantalla puja perquè l’últim partit no quedi tapat pel teclat.',
        fr: 'Quand tu saisis un score exact, l’écran défile pour que le dernier match ne soit plus caché par le clavier.',
        it: 'Quando scrivi un risultato esatto, la schermata scorre verso l’alto così l’ultima partita non resta coperta dalla tastiera.',
        de: 'Wenn du ein exaktes Ergebnis eingibst, scrollt der Bildschirm nach oben, damit das letzte Spiel nicht von der Tastatur verdeckt wird.',
      },
      {
        es: 'Arreglo: el aviso de subida de nivel sale una sola vez.',
        en: 'Fix: the level-up notice now appears only once.',
        ca: 'Arreglat: l’avís de pujada de nivell surt una sola vegada.',
        fr: 'Correction : l’alerte de passage de niveau n’apparaît plus qu’une seule fois.',
        it: 'Correzione: l’avviso di salita di livello compare una sola volta.',
        de: 'Behoben: Die Meldung zum Level-Aufstieg erscheint jetzt nur noch einmal.',
      },
      {
        es: 'Las imágenes para compartir usan el nombre corto de los equipos ("Barça", "Atleti") y ya no se cortan.',
        en: 'Share images use short team names ("Barça", "Atleti") so they no longer get cut off.',
        ca: 'Les imatges per compartir fan servir el nom curt dels equips («Barça», «Atleti») i ja no es retallen.',
        fr: 'Les images à partager utilisent le nom court des équipes (« Barça », « Atleti ») et ne sont plus coupées.',
        it: 'Le immagini da condividere usano il nome breve delle squadre («Barça», «Atleti») e non vengono più tagliate.',
        de: 'Die Bilder zum Teilen nutzen die Kurznamen der Teams („Barça“, „Atleti“) und werden nicht mehr abgeschnitten.',
      },
      {
        es: 'Tabla: en Semanal puedes elegir una jornada (J1, J2…) de cada liga para ver lo que se puntuó en ella.',
        en: 'Table: in Weekly you can pick a matchday (MD1, MD2…) of each league to see what was scored in it.',
        ca: 'Taula: a Setmanal pots triar una jornada (J1, J2…) de cada lliga per veure què es va puntuar en ella.',
        fr: 'Classement : dans Hebdo, tu peux choisir une journée (J1, J2…) de chaque compétition pour voir ce qui s’y est marqué.',
        it: 'Classifica: in Settimanale puoi scegliere una giornata (G1, G2…) di ogni campionato per vedere i punti fatti in quella giornata.',
        de: 'Tabelle: Unter „Woche“ kannst du für jede Liga einen Spieltag (ST1, ST2…) auswählen und sehen, was dort gepunktet wurde.',
      },
      {
        es: 'Los partidos sin hora confirmada muestran «Hora por confirmar» en vez de las 2:00, y la hora se actualiza sola en cuanto se confirma.',
        en: 'Matches without a confirmed time now show "Time to be confirmed" instead of 2:00 AM, and the time updates by itself once it is confirmed.',
        ca: 'Els partits sense hora confirmada mostren «Hora per confirmar» en lloc de les 2:00, i l’hora s’actualitza sola tan bon punt es confirma.',
        fr: 'Les matchs sans heure confirmée affichent « Heure à confirmer » au lieu de 2 h 00, et l’heure se met à jour toute seule dès qu’elle est confirmée.',
        it: 'Le partite senza orario confermato mostrano «Orario da confermare» invece delle 2:00, e l’orario si aggiorna da solo appena viene confermato.',
        de: 'Spiele ohne bestätigte Uhrzeit zeigen „Uhrzeit offen“ statt 2:00 Uhr, und die Zeit aktualisiert sich von selbst, sobald sie feststeht.',
      },
      {
        es: 'Arreglo: el contador de insignias cuenta las distintas, no las repetidas en cada grupo.',
        en: 'Fix: the badge counter now counts distinct badges, not the same one repeated in every group.',
        ca: 'Arreglat: el comptador d’insígnies compta les diferents, no les repetides a cada grup.',
        fr: 'Correction : le compteur de badges compte les badges distincts, plus les mêmes badges répétés dans chaque groupe.',
        it: 'Correzione: il contatore dei badge conta quelli diversi, non quelli ripetuti in ogni gruppo.',
        de: 'Behoben: Der Abzeichen-Zähler zählt jetzt verschiedene Abzeichen und nicht dasselbe Abzeichen in jeder Gruppe mehrfach.',
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
        ca: 'Ja pots fer servir l’app en anglès: tria l’idioma a Perfil > Aparença.',
        fr: 'Tu peux maintenant utiliser l’app en anglais : choisis la langue dans Profil > Apparence.',
        it: 'Ora puoi usare l’app anche in inglese: scegli la lingua in Profilo > Aspetto.',
        de: 'Du kannst die App jetzt auch auf Englisch nutzen: Wähle die Sprache unter Profil > Darstellung.',
      },
      {
        es: 'Copia tus pronósticos de otro grupo con un toque (entre grupos con el mismo modo de juego) y cámbialos después si quieres.',
        en: 'Copy your predictions from another group with one tap (between groups with the same game mode) and change them afterwards if you like.',
        ca: 'Copia els teus pronòstics d’un altre grup amb un toc (entre grups amb el mateix mode de joc) i canvia’ls després si vols.',
        fr: 'Copie tes pronostics d’un autre groupe d’un seul geste (entre groupes ayant le même mode de jeu), puis modifie-les si tu veux.',
        it: 'Copia i tuoi pronostici da un altro gruppo con un tocco (tra gruppi con la stessa modalità di gioco) e cambiali dopo, se vuoi.',
        de: 'Kopiere deine Tipps mit einem Fingertipp aus einer anderen Gruppe (zwischen Gruppen mit demselben Spielmodus) und ändere sie danach, wenn du willst.',
      },
      {
        es: 'La jornada más próxima siempre está abierta para pronosticar.',
        en: 'The nearest matchday is always open for predictions.',
        ca: 'La jornada més propera sempre està oberta per pronosticar.',
        fr: 'La journée la plus proche est toujours ouverte aux pronostics.',
        it: 'La giornata più vicina è sempre aperta per pronosticare.',
        de: 'Der nächstgelegene Spieltag ist immer zum Tippen geöffnet.',
      },
      {
        es: 'Los administradores pueden cambiar el nombre del grupo.',
        en: 'Group administrators can now rename the group.',
        ca: 'Els administradors poden canviar el nom del grup.',
        fr: 'Les administrateurs peuvent renommer le groupe.',
        it: 'Gli amministratori possono cambiare il nome del gruppo.',
        de: 'Admins können jetzt den Namen der Gruppe ändern.',
      },
      {
        es: 'Las pestañas cambian al instante y Grupos y Tabla cargan más rápido.',
        en: 'Tabs switch instantly, and Groups and Table load faster.',
        ca: 'Les pestanyes canvien a l’instant i Grups i Taula carreguen més ràpid.',
        fr: 'Les onglets changent instantanément, et Groupes et Classement se chargent plus vite.',
        it: 'Il passaggio tra le sezioni è istantaneo, e Gruppi e Classifica si caricano più in fretta.',
        de: 'Die Tabs wechseln sofort, und Gruppen und Tabelle laden schneller.',
      },
      {
        es: 'Perfil: trofeos e insignias en una cuadrícula más cómoda, y arreglos en la pantalla de nivel.',
        en: 'Profile: trophies and badges in a more comfortable grid, plus fixes on the level screen.',
        ca: 'Perfil: trofeus i insígnies en una quadrícula més còmoda, i correccions a la pantalla de nivell.',
        fr: 'Profil : trophées et badges dans une grille plus confortable, et corrections sur l’écran des niveaux.',
        it: 'Profilo: trofei e badge in una griglia più comoda, e correzioni nella schermata del livello.',
        de: 'Profil: Trophäen und Abzeichen in einem übersichtlicheren Raster, dazu Korrekturen auf dem Level-Bildschirm.',
      },
      {
        es: 'Arreglo: las insignias con el progreso ya completo se conceden aunque no se hubieran iluminado.',
        en: 'Fix: badges whose progress was already complete are now awarded even if they had not lit up.',
        ca: 'Arreglat: les insígnies amb el progrés ja complet es concedeixen encara que no s’haguessin il·luminat.',
        fr: 'Correction : les badges dont la progression était déjà complète sont maintenant attribués, même s’ils ne s’étaient pas allumés.',
        it: 'Correzione: i badge con il progresso già completo vengono assegnati anche se non si erano illuminati.',
        de: 'Behoben: Abzeichen, deren Fortschritt schon vollständig war, werden jetzt vergeben, auch wenn sie nicht aufgeleuchtet hatten.',
      },
      {
        es: 'Novedad: este aviso. La primera vez que abras una versión nueva verás aquí lo que ha cambiado.',
        en: "New: this notice. The first time you open a new version, you'll see here what has changed.",
        ca: 'Novetat: aquest avís. La primera vegada que obris una versió nova, hi veuràs què ha canviat.',
        fr: 'Nouveau : cette fenêtre. La première fois que tu ouvres une nouvelle version, tu verras ici ce qui a changé.',
        it: 'Novità: questo avviso. La prima volta che apri una versione nuova vedrai qui cosa è cambiato.',
        de: 'Neu: diese Mitteilung. Wenn du eine neue Version zum ersten Mal öffnest, siehst du hier, was sich geändert hat.',
      },
    ],
  },
];
