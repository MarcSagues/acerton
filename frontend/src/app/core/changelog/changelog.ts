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
 * - Una novedad grande (un modo de juego nuevo) puede llevar `headline`: sale destacada arriba del
 *   pop-up, con el titular y la descripción debajo.
 * - `date` es la de la publicación (AAAA-MM-DD).
 */
import type { Lang } from '../i18n/translate';

/** Un texto en varios idiomas: es y en obligatorios, el resto opcional (si falta, se usa el ingles). */
export interface LocalizedText {
  es: string;
  en: string;
  ca?: string;
  fr?: string;
  it?: string;
  de?: string;
}

export interface ChangelogChange extends LocalizedText {
  /**
   * Opcional: titular. Con el, el cambio sale destacado arriba del pop-up (titular en grande y el texto
   * debajo como descripcion) en vez de como una linea mas de la lista. Solo para novedades grandes.
   */
  headline?: LocalizedText;
}

/** Texto en un idioma, o en ingles si todavia no esta traducido a ese. */
export function localized(text: LocalizedText, lang: Lang): string {
  return text[lang] ?? text.en;
}

/** Texto de un cambio en un idioma, o en ingles si todavia no esta traducido a ese. */
export function changeText(change: ChangelogChange, lang: Lang): string {
  return localized(change, lang);
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
    version: '1.1.0',
    date: '2026-10-13',
    changes: [
      {
        headline: {
          es: 'NUEVO MODO DE JUEGO: ¡QUIZ!',
          en: 'NEW GAME MODE: QUIZ!',
          ca: 'NOU MODE DE JOC: QUIZ!',
          fr: 'NOUVEAU MODE DE JEU : QUIZ !',
          it: 'NUOVA MODALITÀ DI GIOCO: QUIZ!',
          de: 'NEUER SPIELMODUS: QUIZ!',
        },
        es: 'Responde preguntas sobre los partidos de cada liga y compite con toda la comunidad, aunque no tengas grupo. Lo encuentras abajo a la derecha; tu Perfil sigue en tu avatar.',
        en: "Answer questions about each league's games and compete with the whole community, even without a group. Find it at the bottom right; your Profile is still behind your avatar.",
        ca: 'Respon preguntes sobre els partits de cada lliga i competeix amb tota la comunitat, encara que no tinguis grup. El trobaràs a baix a la dreta; el teu Perfil continua al teu avatar.',
        fr: 'Réponds à des questions sur les matchs de chaque ligue et affronte toute la communauté, même sans groupe. Il est en bas à droite ; ton Profil reste accessible depuis ton avatar.',
        it: 'Rispondi a domande sulle partite di ogni campionato e sfida tutta la community, anche senza gruppo. Lo trovi in basso a destra; il tuo Profilo resta sul tuo avatar.',
        de: 'Beantworte Fragen zu den Spielen jeder Liga und miss dich mit der ganzen Community, auch ohne Gruppe. Du findest es unten rechts; dein Profil erreichst du weiter über deinen Avatar.',
      },
      {
        es: 'Avisos del Quiz, si los quieres: cuando se abre, 24 horas antes del cierre y 1 hora antes. Actívalos en Perfil > Ajustes > Avisos.',
        en: 'Quiz notifications, if you want them: when it opens, 24 hours before it closes and 1 hour before. Turn them on in Profile > Settings > Notifications.',
        ca: 'Avisos del Quiz, si els vols: quan s’obre, 24 hores abans del tancament i 1 hora abans. Activa’ls a Perfil > Ajustos > Avisos.',
        fr: 'Notifications du Quiz, si tu le souhaites : à l’ouverture, 24 heures avant la clôture et 1 heure avant. Active-les dans Profil > Réglages > Notifications.',
        it: 'Avvisi del Quiz, se li vuoi: quando si apre, 24 ore prima della chiusura e 1 ora prima. Attivali in Profilo > Impostazioni > Avvisi.',
        de: 'Quiz-Mitteilungen, wenn du sie willst: beim Öffnen, 24 Stunden und 1 Stunde vor Schluss. Schalte sie unter Profil > Einstellungen > Mitteilungen ein.',
      },
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
        es: 'Ya puedes usar la app en catalán, francés, italiano y alemán: elige el idioma en Perfil > Ajustes > Idioma.',
        en: 'You can now use the app in Catalan, French, Italian and German: choose the language in Profile > Settings > Language.',
        ca: 'Ja pots fer servir l’app en català, francès, italià i alemany: tria l’idioma a Perfil > Ajustos > Idioma.',
        fr: 'Tu peux maintenant utiliser l’appli en catalan, français, italien et allemand : choisis la langue dans Profil > Réglages > Langue.',
        it: 'Ora puoi usare l’app in catalano, francese, italiano e tedesco: scegli la lingua in Profilo > Impostazioni > Lingua.',
        de: 'Du kannst die App jetzt auf Katalanisch, Französisch, Italienisch und Deutsch nutzen: Wähle die Sprache unter Profil > Einstellungen > Sprache.',
      },
      {
        es: 'En la comparativa del grupo, los resultados exactos salen en dorado para distinguirlos de los aciertos de ganador.',
        en: 'In the group comparison, exact scores now show in gold so you can tell them apart from correct winners.',
        ca: 'A la comparativa del grup, els resultats exactes surten en daurat per distingir-los dels encerts de guanyador.',
        fr: 'Dans la comparaison du groupe, les scores exacts s’affichent en doré pour les distinguer des bons vainqueurs.',
        it: 'Nel confronto del gruppo, i risultati esatti appaiono in oro per distinguerli dai vincitori azzeccati.',
        de: 'Im Gruppenvergleich werden exakte Ergebnisse jetzt in Gold angezeigt, damit du sie von richtigen Siegertipps unterscheiden kannst.',
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
        es: 'Al acabar una jornada, en Jornada ya sale la siguiente si está abierta, aunque falte algún resultado o haya un partido aplazado o cancelado.',
        en: 'When a matchday ends, Matchday now shows the next one if it is already open, even if a result is still missing or a match was postponed or cancelled.',
        ca: 'Quan s’acaba una jornada, a Jornada ja surt la següent si està oberta, encara que falti algun resultat o hi hagi un partit ajornat o cancel·lat.',
        fr: 'À la fin d’une journée, Journée affiche déjà la suivante si elle est ouverte, même s’il manque un résultat ou si un match a été reporté ou annulé.',
        it: 'Quando finisce una giornata, in Giornata compare già la successiva se è aperta, anche se manca un risultato o una partita è stata rinviata o annullata.',
        de: 'Wenn ein Spieltag vorbei ist, zeigt Spieltag schon den nächsten, sobald er offen ist, auch wenn noch ein Ergebnis fehlt oder ein Spiel verschoben oder abgesagt wurde.',
      },
      {
        es: 'Puedes cambiar tu pronóstico de un partido aplazado o cancelado mientras no se juegue.',
        en: 'You can change your prediction for a postponed or cancelled match until it is played.',
        ca: 'Pots canviar el teu pronòstic d’un partit ajornat o cancel·lat mentre no es jugui.',
        fr: 'Tu peux modifier ton pronostic d’un match reporté ou annulé tant qu’il n’est pas joué.',
        it: 'Puoi cambiare il tuo pronostico di una partita rinviata o annullata finché non si gioca.',
        de: 'Du kannst deinen Tipp für ein verschobenes oder abgesagtes Spiel ändern, solange es nicht gespielt wurde.',
      },
      {
        es: 'Los avisos de jornada terminada y de partidos por pronosticar dicen de qué grupo y liga son, y el de jornada terminada deja claro que son tus puntos de toda la jornada.',
        en: 'Matchday-finished and matches-to-predict notifications now say which group and league they are about, and the matchday one makes clear the points are your total for the whole matchday.',
        ca: 'Els avisos de jornada acabada i de partits per pronosticar diuen de quin grup i lliga són, i el de jornada acabada deixa clar que són els teus punts de tota la jornada.',
        fr: 'Les notifications de journée terminée et de matchs à pronostiquer indiquent le groupe et le championnat, et celle de fin de journée précise que ce sont tes points sur toute la journée.',
        it: 'Gli avvisi di giornata conclusa e di partite da pronosticare indicano il gruppo e il campionato, e quello di fine giornata chiarisce che sono i tuoi punti di tutta la giornata.',
        de: 'Die Mitteilungen zu beendeten Spieltagen und offenen Tipps zeigen jetzt Gruppe und Liga, und die zum Spieltagsende macht klar, dass es deine Punkte für den ganzen Spieltag sind.',
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
      {
        es: 'Elige tu equipo favorito en Perfil > Ajustes: su bandera, con los colores del club, sale en tu perfil y la ven quienes lo visiten.',
        en: 'Pick your favorite team in Profile > Settings: its flag, in the club colors, shows on your profile for anyone who visits it.',
        ca: 'Tria el teu equip preferit a Perfil > Ajustos: la seva bandera, amb els colors del club, surt al teu perfil i la veu qui el visiti.',
        fr: 'Choisis ton équipe préférée dans Profil > Réglages : son drapeau, aux couleurs du club, s’affiche sur ton profil, visible par ceux qui le visitent.',
        it: 'Scegli la tua squadra del cuore in Profilo > Impostazioni: la sua bandiera, con i colori del club, appare sul tuo profilo e la vede chi lo visita.',
        de: 'Wähle unter Profil > Einstellungen dein Lieblingsteam: Seine Flagge in den Vereinsfarben erscheint auf deinem Profil und ist für alle sichtbar, die es besuchen.',
      },
      {
        es: 'Al crear tu cuenta también puedes entrar con Google o Apple, igual que al iniciar sesión.',
        en: 'When creating your account you can also continue with Google or Apple, just like when signing in.',
        ca: 'En crear el teu compte també pots continuar amb Google o Apple, igual que en iniciar sessió.',
        fr: 'En créant ton compte, tu peux aussi continuer avec Google ou Apple, comme à la connexion.',
        it: 'Quando crei il tuo account puoi anche continuare con Google o Apple, come all’accesso.',
        de: 'Beim Erstellen deines Kontos kannst du auch mit Google oder Apple fortfahren, genau wie beim Anmelden.',
      },
      {
        es: 'Cada pantalla se abre desde arriba, sin quedarse en el punto donde estabas en la anterior.',
        en: 'Every screen now opens from the top instead of staying where you were on the previous one.',
        ca: 'Cada pantalla s’obre des de dalt, sense quedar-se on eres a l’anterior.',
        fr: 'Chaque écran s’ouvre désormais en haut, sans rester là où tu étais sur le précédent.',
        it: 'Ogni schermata si apre dall’alto, senza restare dov’eri nella precedente.',
        de: 'Jeder Bildschirm öffnet sich jetzt oben, statt dort zu bleiben, wo du auf dem vorherigen warst.',
      },
      {
        es: 'Nueva pantalla de Ajustes en tu Perfil, con una pestaña para cada cosa: nombre, equipo, avisos, apariencia, idioma y contraseña.',
        en: 'New Settings screen in your Profile, with a tab for each thing: name, team, notifications, appearance, language and password.',
        ca: 'Nova pantalla d’Ajustos al teu Perfil, amb una pestanya per a cada cosa: nom, equip, avisos, aparença, idioma i contrasenya.',
        fr: 'Nouvel écran Réglages dans ton Profil, avec un onglet pour chaque chose : nom, équipe, notifications, apparence, langue et mot de passe.',
        it: 'Nuova schermata Impostazioni nel tuo Profilo, con una scheda per ogni cosa: nome, squadra, avvisi, aspetto, lingua e password.',
        de: 'Neuer Einstellungsbildschirm in deinem Profil, mit einem Tab für jedes Thema: Name, Team, Mitteilungen, Darstellung, Sprache und Passwort.',
      },
      {
        es: 'Nuevo Historial de Quiz: en Estadísticas, la tuya y la de otros jugadores, ves todos los quizzes cerrados con lo que se respondió y si se acertó, y puedes filtrar por liga.',
        en: 'New Quiz history: in Statistics, yours and other players’, see every closed quiz with what was answered and whether it was right, and filter by league.',
        ca: 'Nou Historial de Quiz: a Estadístiques, la teva i la d’altres jugadors, veus tots els quizzes tancats amb el que es va respondre i si es va encertar, i pots filtrar per lliga.',
        fr: 'Nouvel historique du Quiz : dans Statistiques, le tien et celui des autres joueurs, tu vois tous les quiz clos avec les réponses données et si elles étaient bonnes, et tu peux filtrer par ligue.',
        it: 'Nuovo storico dei Quiz: in Statistiche, il tuo e quello degli altri giocatori, vedi tutti i quiz chiusi con le risposte date e se erano giuste, e puoi filtrare per campionato.',
        de: 'Neu: Quiz-Verlauf. In den Statistiken, deinen und denen anderer Spieler, siehst du alle beendeten Quizze mit den Antworten und ob sie richtig waren, und kannst nach Liga filtern.',
      },
      {
        es: 'La gráfica de Tabla también sale en «General»: junta las jornadas de todas las ligas por orden de fecha (J1 Liga, J1 Champions, J2 Liga...).',
        en: 'The Table chart now also shows in "General": it puts the matchdays of every league in date order (MD1 La Liga, MD1 Champions, MD2 La Liga...).',
        ca: 'La gràfica de Taula també surt a «General»: ajunta les jornades de totes les lligues per ordre de data (J1 Lliga, J1 Champions, J2 Lliga...).',
        fr: 'Le graphique de Classement apparaît aussi dans « Général » : il met les journées de toutes les ligues par ordre de date (J1 Liga, J1 Champions, J2 Liga...).',
        it: 'Il grafico di Classifica compare anche in «Generale»: mette in ordine di data le giornate di tutti i campionati (G1 Liga, G1 Champions, G2 Liga...).',
        de: 'Das Diagramm in der Tabelle gibt es jetzt auch unter „Gesamt“: Es ordnet die Spieltage aller Ligen nach Datum (ST1 Liga, ST1 Champions, ST2 Liga ...).',
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
