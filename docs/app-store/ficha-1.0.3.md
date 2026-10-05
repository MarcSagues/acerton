# Ficha de la App Store — versión 1.0.3

Todo el texto listo para pegar en App Store Connect, en cada idioma. Los límites de Apple están
comprobados (nombre 30, subtítulo 30, palabras clave 100, texto promocional 170, descripción y novedades
4.000). Los nombres siguen el patrón actual «Piqo: Quiniela con Amigos» y se explican en
`docs/quiniela/decisions.md`. Los textos los ha escrito Claude sin revisión de nativos, igual que la app.

## Cómo dejarlo listo para enviar

1. **Versión y compilación.** En App Store Connect > Piqo, abre la versión **1.0.3** y, en «Compilación»,
   elige la última que ha subido el flujo de iOS con la 1.0.3 y los idiomas (aparece cuando Apple termina de
   procesarla, 10-30 minutos después de subirla). No uses la build #108, que se subió como 1.0.4 por error.
2. **Localizaciones.** En la barra lateral, «Información de la app» > «Localizaciones»: añade Catalán, Francés,
   Italiano, Alemán, Inglés (Reino Unido) e Inglés (EE. UU.). Para cada idioma pega **Nombre** y **Subtítulo**.
3. **Textos de la versión.** En la página de la versión, para cada idioma pega **Texto promocional**,
   **Descripción**, **Palabras clave** y **Novedades**. La URL de soporte y la de marketing son las mismas que
   en español.
4. **Capturas.** Los idiomas nuevos no necesitan capturas propias: Apple enseña las del idioma principal si no
   subes otras (si Connect las pide, copia las del español).
5. **Revisión.** Comprueba que la cuenta de demostración de las notas para revisión sigue funcionando, que la
   política de privacidad no cambia (no se recogen datos nuevos) y pulsa **Añadir para revisión > Enviar a
   revisión**.

Dos avisos: el **nombre y el subtítulo nuevos solo se ven cuando Apple aprueba la versión**, y Apple rechaza un
nombre que ya tenga otra app (te lo dice al guardar). Las novedades de abajo son las de la 1.0.3 completa,
idiomas incluidos.

Las **palabras clave** van separadas por comas y sin espacios, y no repiten lo que ya dicen el nombre o el
subtítulo. Evitan a propósito «apuestas»/«betting» (la app es sin dinero y esas palabras te acercan a la
categoría de juegos de azar de Apple).


---

## Español (España) — idioma principal  (`es`)

**Nombre (máx. 30)** — 25 caracteres

```
Piqo: Quiniela con Amigos
```

**Subtítulo (máx. 30)** — 29 caracteres

```
Porra de fútbol y pronósticos
```

**Palabras clave (máx. 100)** — 90 caracteres

```
predicciones,laliga,champions,premier,jornada,resultados,marcador,clasificación,grupo,peña
```

**Texto promocional (máx. 170)** — 130 caracteres

```
Ya en 6 idiomas. Crea tu grupo, pronostica cada jornada y que la tabla decida quién manda. Gratis, sin dinero real y sin apuestas.
```

**Descripción (máx. 4000)** — 1205 caracteres

```
Piqo es el juego social de pronósticos de fútbol para jugar con tus amigos: creáis un grupo, pronosticáis cada jornada y la tabla decide quién manda. Gratis, sin dinero real y sin apuestas.

DOS FORMAS DE JUGAR
• Quiniela 1X2: elige local, empate o visitante.
• Resultado exacto: clava el marcador (5 puntos por el exacto y 2 si solo aciertas el ganador o el empate).

TU GRUPO, TUS REGLAS
• Crea un grupo privado con código de invitación o únete a uno público.
• Elige las competiciones: las grandes ligas europeas y la Champions League.
• Tabla semanal y total, con la clasificación de cada jornada anterior.
• Comodín de remontada: un empujón extra para quien va por detrás.

PIQUES, RACHAS Y LOGROS
• Rachas, insignias, niveles y trofeos de temporada.
• Avatares y mascotas que se desbloquean al subir de nivel.
• Comparte tus pronósticos y resultados en imágenes listas para el chat del grupo.
• Avisos antes de que cierre la jornada para que no se te olvide pronosticar.

TODO QUEDA ENTRE VOSOTROS
Los puntos y las insignias no tienen valor monetario ni se pueden canjear por premios. Piqo es solo diversión y piques con tu gente.

Disponible en español, inglés, catalán, francés, italiano y alemán.
```

**Novedades de esta versión (máx. 4000)** — 655 caracteres

```
• Piqo ya está en catalán, francés, italiano y alemán, además de español e inglés: elige el idioma en Perfil > Apariencia.
• Al escribir un resultado exacto, la pantalla sube para que el último partido no quede tapado por el teclado.
• Tabla: en Semanal puedes elegir una jornada de cada liga para ver lo que se puntuó en ella.
• Las imágenes para compartir usan el nombre corto de los equipos («Barça», «Atleti») y ya no se cortan.
• Los partidos sin hora confirmada muestran «Hora por confirmar» y la hora se actualiza sola en cuanto se confirma.
• Arreglos: el aviso de subida de nivel sale una sola vez y el contador de insignias cuenta las distintas.
```


---

## English (U.K.)  (`en-GB`)

**Nombre (máx. 30)** — 26 caracteres

```
Piqo: Predict with Friends
```

**Subtítulo (máx. 30)** — 27 caracteres

```
Football pool & predictions
```

**Palabras clave (máx. 100)** — 95 caracteres

```
tipping,league,laliga,champions,premier,matchday,fixtures,results,table,group,banter,score,tips
```

**Texto promocional (máx. 170)** — 133 caracteres

```
Now in 6 languages. Create your group, predict every matchday and let the table decide who rules. Free, no real money and no betting.
```

**Descripción (máx. 4000)** — 1165 caracteres

```
Piqo is the social football prediction game to play with your friends: create a group, predict every matchday and let the table decide who rules. Free, no real money and no betting.

TWO WAYS TO PLAY
• 1X2 picks: choose home win, draw or away win.
• Exact score: nail the result (5 points for the exact score, 2 if you only get the winner or the draw).

YOUR GROUP, YOUR RULES
• Create a private group with an invite code or join a public one.
• Choose the competitions: the big European leagues and the Champions League.
• Weekly and overall tables, including the standings of every previous matchday.
• Comeback wildcard: an extra boost for whoever is behind.

BANTER, STREAKS AND ACHIEVEMENTS
• Streaks, badges, levels and season trophies.
• Avatars and mascots that unlock as you level up.
• Share your predictions and results as images, ready for the group chat.
• Reminders before the matchday closes so you never forget to predict.

IT ALL STAYS BETWEEN YOU
Points and badges have no monetary value and can't be exchanged for prizes. Piqo is just fun and friendly rivalry with your people.

Available in English, Spanish, Catalan, French, Italian and German.
```

**Novedades de esta versión (máx. 4000)** — 636 caracteres

```
• Piqo is now available in Catalan, French, Italian and German, as well as Spanish and English: choose the language in Profile > Appearance.
• When you type an exact score, the screen scrolls up so the last match isn't hidden behind the keyboard.
• Table: in Weekly you can pick a matchday of each league to see what was scored in it.
• Share images use short team names ("Barça", "Atleti") so they no longer get cut off.
• Matches without a confirmed time show "Time to be confirmed", and the time updates by itself once it is confirmed.
• Fixes: the level-up notice now appears only once, and the badge counter counts distinct badges.
```


---

## English (U.S.)  (`en-US`)

**Nombre (máx. 30)** — 26 caracteres

```
Piqo: Predict with Friends
```

**Subtítulo (máx. 30)** — 19 caracteres

```
Soccer picks & pool
```

**Palabras clave (máx. 100)** — 98 caracteres

```
pickem,league,laliga,champions,premier,matchday,fixtures,results,standings,group,banter,score,tips
```

**Texto promocional (máx. 170)** — 149 caracteres

```
Now in 6 languages. Create your group, make your soccer picks every matchday and let the standings decide who rules. Free, no real money, no betting.
```

**Descripción (máx. 4000)** — 1182 caracteres

```
Piqo is the social soccer prediction game to play with your friends: create a group, make your picks every matchday and let the standings decide who rules. Free, no real money and no betting.

TWO WAYS TO PLAY
• 1X2 picks: choose home win, draw or away win.
• Exact score: nail the result (5 points for the exact score, 2 if you only get the winner or the draw).

YOUR GROUP, YOUR RULES
• Create a private group with an invite code or join a public one.
• Choose the competitions: the big European leagues and the Champions League.
• Weekly and overall standings, including the results of every previous matchday.
• Comeback wildcard: an extra boost for whoever is behind.

TRASH TALK, STREAKS AND ACHIEVEMENTS
• Streaks, badges, levels and season trophies.
• Avatars and mascots that unlock as you level up.
• Share your picks and results as images, ready for the group chat.
• Reminders before the matchday closes so you never forget to make your picks.

IT ALL STAYS BETWEEN YOU
Points and badges have no monetary value and can't be exchanged for prizes. Piqo is just fun and friendly rivalry with your people.

Available in English, Spanish, Catalan, French, Italian and German.
```

**Novedades de esta versión (máx. 4000)** — 640 caracteres

```
• Piqo is now available in Catalan, French, Italian and German, as well as Spanish and English: choose the language in Profile > Appearance.
• When you type an exact score, the screen scrolls up so the last match isn't hidden behind the keyboard.
• Standings: in Weekly you can pick a matchday of each league to see what was scored in it.
• Share images use short team names ("Barça", "Atleti") so they no longer get cut off.
• Matches without a confirmed time show "Time to be confirmed", and the time updates by itself once it is confirmed.
• Fixes: the level-up notice now appears only once, and the badge counter counts distinct badges.
```


---

## Català  (`ca`)

**Nombre (máx. 30)** — 24 caracteres

```
Piqo: Quiniela amb Amics
```

**Subtítulo (máx. 30)** — 28 caracteres

```
Porra de futbol i pronòstics
```

**Palabras clave (máx. 100)** — 91 caracteres

```
predicció,lliga,laliga,champions,premier,jornada,resultats,marcador,classificació,grup,pica
```

**Texto promocional (máx. 170)** — 146 caracteres

```
Ara en 6 idiomes. Crea el teu grup, pronostica cada jornada i que la classificació decideixi qui mana. Gratis, sense diners reals i sense apostes.
```

**Descripción (máx. 4000)** — 1228 caracteres

```
Piqo és el joc social de pronòstics de futbol per jugar amb els teus amics: creeu un grup, pronostiqueu cada jornada i la classificació decideix qui mana. Gratis, sense diners reals i sense apostes.

DUES MANERES DE JUGAR
• Quiniela 1X2: tria local, empat o visitant.
• Resultat exacte: encerta el marcador (5 punts per l’exacte i 2 si només encertes el guanyador o l’empat).

EL TEU GRUP, LES TEVES REGLES
• Crea un grup privat amb codi d’invitació o uneix-te a un de públic.
• Tria les competicions: les grans lligues europees i la Champions League.
• Classificació setmanal i total, amb la classificació de cada jornada anterior.
• Comodí de remuntada: un cop de mà extra per a qui va per darrere.

PIQUES, RATXES I ÈXITS
• Ratxes, insígnies, nivells i trofeus de temporada.
• Avatars i mascotes que es desbloquegen en pujar de nivell.
• Comparteix els teus pronòstics i resultats en imatges a punt per al xat del grup.
• Avisos abans que tanqui la jornada perquè no t’oblidis de pronosticar.

TOT ES QUEDA ENTRE VOSALTRES
Els punts i les insígnies no tenen valor monetari ni es poden bescanviar per premis. Piqo és només diversió i piques amb la teva gent.

Disponible en català, castellà, anglès, francès, italià i alemany.
```

**Novedades de esta versión (máx. 4000)** — 642 caracteres

```
• Piqo ja és en català, francès, italià i alemany, a més de castellà i anglès: tria l’idioma a Perfil > Aparença.
• En escriure un resultat exacte, la pantalla puja perquè l’últim partit no quedi tapat pel teclat.
• Classificació: a Setmanal pots triar una jornada de cada lliga per veure què es va puntuar en aquella.
• Les imatges per compartir fan servir el nom curt dels equips («Barça», «Atleti») i ja no es tallen.
• Els partits sense hora confirmada mostren «Hora per confirmar» i l’hora s’actualitza sola quan es confirma.
• Correccions: l’avís de pujada de nivell surt una sola vegada i el comptador d’insígnies compta les diferents.
```


---

## Français  (`fr`)

**Nombre (máx. 30)** — 28 caracteres

```
Piqo - Pronostics entre Amis
```

**Subtítulo (máx. 30)** — 25 caracteres

```
Pronos foot et classement
```

**Palabras clave (máx. 100)** — 90 caracteres

```
football,ligue1,laliga,champions,premier,journée,résultats,groupe,score,défi,gratuit,match
```

**Texto promocional (máx. 170)** — 150 caracteres

```
Maintenant en 6 langues. Crée ton groupe, pronostique chaque journée et laisse le classement décider qui commande. Gratuit, sans argent réel ni paris.
```

**Descripción (máx. 4000)** — 1323 caracteres

```
Piqo est le jeu social de pronostics de football à jouer entre amis : vous créez un groupe, vous pronostiquez chaque journée et le classement décide qui commande. Gratuit, sans argent réel et sans paris.

DEUX FAÇONS DE JOUER
• Pronostic 1X2 : choisis domicile, nul ou extérieur.
• Score exact : trouve le score (5 points pour le score exact, 2 si tu trouves seulement le vainqueur ou le nul).

TON GROUPE, VOS RÈGLES
• Crée un groupe privé avec un code d’invitation ou rejoins un groupe public.
• Choisis les compétitions : les grands championnats européens et la Ligue des champions.
• Classement hebdomadaire et général, avec le classement de chaque journée passée.
• Joker remontada : un petit coup de pouce pour celui qui est derrière.

CHAMBRAGE, SÉRIES ET SUCCÈS
• Séries, badges, niveaux et trophées de saison.
• Avatars et mascottes à débloquer en montant de niveau.
• Partage tes pronostics et tes résultats en images prêtes pour la discussion du groupe.
• Des notifications avant la clôture de la journée pour ne pas oublier de pronostiquer.

TOUT RESTE ENTRE VOUS
Les points et les badges n’ont aucune valeur monétaire et ne peuvent pas être échangés contre des prix. Piqo, c’est juste du plaisir et de la rivalité amicale avec tes amis.

Disponible en français, espagnol, anglais, catalan, italien et allemand.
```

**Novedades de esta versión (máx. 4000)** — 765 caracteres

```
• Piqo est désormais disponible en catalan, français, italien et allemand, en plus de l’espagnol et de l’anglais : choisis la langue dans Profil > Apparence.
• Quand tu saisis un score exact, l’écran remonte pour que le dernier match ne soit pas masqué par le clavier.
• Classement : dans Hebdomadaire, tu peux choisir une journée de chaque championnat pour voir les points obtenus.
• Les images à partager utilisent le nom court des équipes (« Barça », « Atleti ») et ne sont plus coupées.
• Les matchs dont l’heure n’est pas confirmée affichent « Heure à confirmer », et l’heure se met à jour toute seule dès qu’elle est confirmée.
• Corrections : l’avis de passage de niveau n’apparaît plus qu’une seule fois et le compteur de badges compte les badges distincts.
```


---

## Italiano  (`it`)

**Nombre (máx. 30)** — 27 caracteres

```
Piqo - Pronostici tra Amici
```

**Subtítulo (máx. 30)** — 27 caracteres

```
Calcio, sfide e classifiche
```

**Palabras clave (máx. 100)** — 93 caracteres

```
seriea,champions,premier,laliga,giornata,risultati,gruppo,punteggio,gioco,gratis,partite,quiz
```

**Texto promocional (máx. 170)** — 155 caracteres

```
Ora in 6 lingue. Crea il tuo gruppo, pronostica ogni giornata e lascia che sia la classifica a decidere chi comanda. Gratis, senza soldi veri né scommesse.
```

**Descripción (máx. 4000)** — 1242 caracteres

```
Piqo è il gioco social di pronostici di calcio da fare con i tuoi amici: create un gruppo, pronosticate ogni giornata e la classifica decide chi comanda. Gratis, senza denaro reale e senza scommesse.

DUE MODI DI GIOCARE
• Schedina 1X2: scegli casa, pareggio o ospite.
• Risultato esatto: azzecca il punteggio (5 punti per il risultato esatto, 2 se azzecchi solo il vincitore o il pareggio).

IL TUO GRUPPO, LE VOSTRE REGOLE
• Crea un gruppo privato con codice d’invito o unisciti a uno pubblico.
• Scegli le competizioni: i grandi campionati europei e la Champions League.
• Classifica settimanale e totale, con la classifica di ogni giornata precedente.
• Jolly rimonta: una spinta in più per chi è rimasto indietro.

SFOTTÒ, SERIE E TRAGUARDI
• Serie, badge, livelli e trofei di stagione.
• Avatar e mascotte che si sbloccano salendo di livello.
• Condividi i tuoi pronostici e i risultati in immagini pronte per la chat del gruppo.
• Avvisi prima della chiusura della giornata, così non dimentichi di pronosticare.

TUTTO RESTA TRA VOI
I punti e i badge non hanno valore monetario e non si possono convertire in premi. Piqo è solo divertimento e sfottò tra amici.

Disponibile in italiano, spagnolo, inglese, catalano, francese e tedesco.
```

**Novedades de esta versión (máx. 4000)** — 719 caracteres

```
• Piqo ora è disponibile in catalano, francese, italiano e tedesco, oltre a spagnolo e inglese: scegli la lingua in Profilo > Aspetto.
• Quando scrivi un risultato esatto, la schermata scorre verso l’alto così l’ultima partita non resta coperta dalla tastiera.
• Classifica: in Settimanale puoi scegliere una giornata di ogni campionato per vedere i punti ottenuti.
• Le immagini da condividere usano il nome breve delle squadre («Barça», «Atleti») e non vengono più tagliate.
• Le partite senza orario confermato mostrano «Orario da confermare» e l’orario si aggiorna da solo appena viene confermato.
• Correzioni: l’avviso di passaggio di livello compare una sola volta e il contatore dei badge conta quelli distinti.
```


---

## Deutsch  (`de`)

**Nombre (máx. 30)** — 29 caracteres

```
Piqo - Tippspiel mit Freunden
```

**Subtítulo (máx. 30)** — 25 caracteres

```
Fußball-Tipps und Tabelle
```

**Palabras clave (máx. 100)** — 100 caracteres

```
bundesliga,champions,premier,laliga,ergebnisse,spieltag,gruppe,vorhersage,liga,kostenlos,quiz,punkte
```

**Texto promocional (máx. 170)** — 160 caracteres

```
Jetzt in 6 Sprachen. Gründe deine Gruppe, tippe jeden Spieltag und lass die Tabelle entscheiden, wer das Sagen hat. Kostenlos, ohne echtes Geld und ohne Wetten.
```

**Descripción (máx. 4000)** — 1310 caracteres

```
Piqo ist das soziale Fußball-Tippspiel für dich und deine Freunde: Ihr gründet eine Gruppe, tippt jeden Spieltag und die Tabelle entscheidet, wer das Sagen hat. Kostenlos, ohne echtes Geld und ohne Wetten.

ZWEI SPIELMODI
• 1X2-Tipp: Heimsieg, Unentschieden oder Auswärtssieg.
• Exaktes Ergebnis: Triff das genaue Ergebnis (5 Punkte für das exakte Ergebnis, 2 Punkte, wenn nur der Sieger oder das Unentschieden stimmt).

DEINE GRUPPE, EURE REGELN
• Gründe eine private Gruppe mit Einladungscode oder tritt einer öffentlichen bei.
• Wähle die Wettbewerbe: die großen europäischen Ligen und die Champions League.
• Wochen- und Gesamttabelle, dazu die Tabelle jedes vergangenen Spieltags.
• Comeback-Joker: ein Extra-Schub für alle, die hinten liegen.

SPRÜCHE, SERIEN UND ERFOLGE
• Serien, Abzeichen, Level und Saison-Trophäen.
• Avatare und Maskottchen, die du mit steigendem Level freischaltest.
• Teile deine Tipps und Ergebnisse als Bilder, bereit für den Gruppenchat.
• Erinnerungen vor Tippschluss, damit du nie vergisst zu tippen.

ALLES BLEIBT UNTER EUCH
Punkte und Abzeichen haben keinen Geldwert und lassen sich nicht gegen Preise eintauschen. Piqo ist einfach Spaß und freundschaftliche Rivalität mit deinen Leuten.

Verfügbar auf Deutsch, Spanisch, Englisch, Katalanisch, Französisch und Italienisch.
```

**Novedades de esta versión (máx. 4000)** — 811 caracteres

```
• Piqo gibt es jetzt auch auf Katalanisch, Französisch, Italienisch und Deutsch, zusätzlich zu Spanisch und Englisch: Wähle die Sprache unter Profil > Darstellung.
• Wenn du ein genaues Ergebnis eingibst, scrollt der Bildschirm nach oben, damit das letzte Spiel nicht von der Tastatur verdeckt wird.
• Tabelle: Unter „Wöchentlich“ kannst du für jede Liga einen Spieltag auswählen und sehen, welche Punkte in diesem geholt wurden.
• Die Bilder zum Teilen verwenden die Kurznamen der Teams („Barça“, „Atleti“) und werden nicht mehr abgeschnitten.
• Spiele ohne bestätigte Uhrzeit zeigen „Uhrzeit noch offen“, und die Uhrzeit aktualisiert sich automatisch, sobald sie bestätigt ist.
• Fehlerbehebungen: Der Hinweis zum Levelaufstieg erscheint nur noch einmal, und der Abzeichen-Zähler zählt verschiedene Abzeichen.
```
