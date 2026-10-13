# Ficha de la App Store — versión 1.1.0

Todo el texto listo para pegar en App Store Connect, en cada idioma. Los límites de Apple están
comprobados (nombre 30, subtítulo 30, palabras clave 100, texto promocional 170, descripción y novedades
4.000). Los nombres siguen el patrón actual «Piqo: Quiniela con Amigos» y se explican en
`docs/quiniela/decisions.md`. Los textos los ha escrito Claude sin revisión de nativos, igual que la app.

La 1.0.3 nunca se publicó (la última es la 1.0.2): lo que estaba preparado para ella sale ahora como **1.1.0**,
con el Quiz como nuevo modo de juego, el equipo favorito, los Ajustes con pestañas y el registro con Google y
Apple. Esta ficha sustituye a la de la 1.0.3.

## Cómo dejarlo listo para enviar

1. **Versión y compilación.** En App Store Connect > Piqo, abre la versión que tenías preparada como 1.0.3 y
   cambia su número a **1.1.0** (se puede mientras esté en «Preparar para enviar» y conserva idiomas y textos).
   Si ya estaba enviada a revisión o aprobada no se puede renombrar: crea una versión 1.1.0 nueva y pega los
   textos de abajo. En «Compilación» elige la que ha subido el flujo de iOS sobre `main` (aparece cuando Apple
   termina de procesarla, 10-30 minutos después de subirla) y comprueba que dice 1.1.0.
2. **Localizaciones.** Si ya las añadiste para la 1.0.3 no hay que repetirlas: **Nombre** y **Subtítulo** son de
   la app, no de la versión. Si no, en la barra lateral, «Información de la app» > «Localizaciones», añade
   Catalán, Francés, Italiano, Alemán, Inglés (Reino Unido) e Inglés (EE. UU.) y pega **Nombre** y **Subtítulo**
   de cada idioma.
3. **Textos de la versión.** En la página de la versión, para cada idioma pega **Texto promocional**,
   **Descripción**, **Palabras clave** y **Novedades**. Cambian respecto a la ficha de la 1.0.3: el texto
   promocional, la descripción (ahora son tres formas de jugar y se cita el equipo favorito) y las novedades
   (las de la 1.1.0 completa). La URL de soporte y la de marketing son las mismas que en español.
4. **Capturas.** Los idiomas nuevos no necesitan capturas propias: Apple enseña las del idioma principal si no
   subes otras (si Connect las pide, copia las del español).
5. **Revisión.** Comprueba que la cuenta de demostración de las notas para revisión sigue funcionando, que la
   política de privacidad no cambia (no se recogen datos nuevos) y pulsa **Añadir para revisión > Enviar a
   revisión**.

Dos avisos: el **nombre y el subtítulo nuevos solo se ven cuando Apple aprueba la versión**, y Apple rechaza un
nombre que ya tenga otra app (te lo dice al guardar). Las novedades de abajo son las de la 1.1.0 completa (todo
lo que cambió desde la 1.0.2: Quiz de jornada, equipo favorito, Ajustes, registro con Google y Apple, idiomas,
gráfica de líneas, rey del marcador exacto, avisos...), copiadas del historial de la app (`changelog.ts`).

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

**Texto promocional (máx. 170)** — 137 caracteres

```
Nuevo: Quiz de jornada. Crea tu grupo, pronostica cada jornada y que la tabla decida quién manda. Gratis, sin dinero real y sin apuestas.
```

**Descripción (máx. 4000)** — 1394 caracteres

```
Piqo es el juego social de pronósticos de fútbol para jugar con tus amigos: creáis un grupo, pronosticáis cada jornada y la tabla decide quién manda. Gratis, sin dinero real y sin apuestas.

TRES FORMAS DE JUGAR
• Quiniela 1X2: elige local, empate o visitante.
• Resultado exacto: clava el marcador (5 puntos por el exacto y 2 si solo aciertas el ganador o el empate).
• Quiz de jornada: responde preguntas sobre los partidos de cada liga y compite con toda la comunidad, aunque no tengas grupo.

TU GRUPO, TUS REGLAS
• Crea un grupo privado con código de invitación o únete a uno público.
• Elige las competiciones: las grandes ligas europeas y la Champions League.
• Tabla semanal y total, con la clasificación de cada jornada anterior.
• Comodín de remontada: un empujón extra para quien va por detrás.

PIQUES, RACHAS Y LOGROS
• Rachas, insignias, niveles y trofeos de temporada.
• Avatares y mascotas que se desbloquean al subir de nivel.
• Elige tu equipo favorito y enseña su bandera en tu perfil.
• Comparte tus pronósticos y resultados en imágenes listas para el chat del grupo.
• Avisos antes de que cierre la jornada para que no se te olvide pronosticar.

TODO QUEDA ENTRE VOSOTROS
Los puntos y las insignias no tienen valor monetario ni se pueden canjear por premios. Piqo es solo diversión y piques con tu gente.

Disponible en español, inglés, catalán, francés, italiano y alemán.
```

**Novedades de esta versión (máx. 4000)** — 2857 caracteres

```
• NUEVO MODO DE JUEGO: ¡QUIZ! Responde preguntas sobre los partidos de cada liga y compite con toda la comunidad, aunque no tengas grupo. Lo encuentras abajo a la derecha; tu Perfil sigue en tu avatar.
• Avisos del Quiz, si los quieres: cuando se abre, 24 horas antes del cierre y 1 hora antes. Actívalos en Perfil > Ajustes > Avisos.
• En Tabla, una gráfica de líneas enseña cómo vais tú y los primeros del grupo jornada a jornada, en Semanal y en Total. Toca «Tú» para ver solo la tuya.
• En los grupos de resultado exacto, Tabla corona al rey del marcador exacto: quién ha clavado más marcadores en la jornada y en total.
• Ya puedes usar la app en catalán, francés, italiano y alemán: elige el idioma en Perfil > Ajustes > Idioma.
• En la comparativa del grupo, los resultados exactos salen en dorado para distinguirlos de los aciertos de ganador.
• Al escribir un resultado exacto, la pantalla sube para que el último partido no quede tapado por el teclado.
• Al acabar una jornada, en Jornada ya sale la siguiente si está abierta, aunque falte algún resultado o haya un partido aplazado o cancelado.
• Puedes cambiar tu pronóstico de un partido aplazado o cancelado mientras no se juegue.
• Los avisos de jornada terminada y de partidos por pronosticar dicen de qué grupo y liga son, y el de jornada terminada deja claro que son tus puntos de toda la jornada.
• Arreglo: el aviso de subida de nivel sale una sola vez.
• Las imágenes para compartir usan el nombre corto de los equipos ("Barça", "Atleti") y ya no se cortan.
• Tabla: en Semanal puedes elegir una jornada (J1, J2…) de cada liga para ver lo que se puntuó en ella.
• Los partidos sin hora confirmada muestran «Hora por confirmar» en vez de las 2:00, y la hora se actualiza sola en cuanto se confirma.
• Arreglo: el contador de insignias cuenta las distintas, no las repetidas en cada grupo.
• Elige tu equipo favorito en Perfil > Ajustes: su bandera, con los colores del club, sale en tu perfil y la ven quienes lo visiten.
• Al crear tu cuenta también puedes entrar con Google o Apple, igual que al iniciar sesión.
• Cada pantalla se abre desde arriba, sin quedarse en el punto donde estabas en la anterior.
• Nueva pantalla de Ajustes en tu Perfil, con una pestaña para cada cosa: nombre, equipo, avisos, apariencia, idioma y contraseña.
• Nuevo Historial de Quiz: en Estadísticas, la tuya y la de otros jugadores, ves todos los quizzes cerrados con lo que se respondió y si se acertó, y puedes filtrar por liga.
• La gráfica de Tabla también sale en «General»: junta las jornadas de todas las ligas por orden de fecha (J1 Liga, J1 Champions, J2 Liga...).
• Pulsa a cualquier jugador, en el Quiz o en Tabla, para ver su perfil: su bandera, sus aciertos y fallos en grupos, su racha, los marcadores exactos que ha clavado, su posición en el Quiz con su historial, sus insignias y trofeos.
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
New: Matchday quiz. Create your group, predict every matchday and let the table decide who rules. Free, no real money and no betting.
```

**Descripción (máx. 4000)** — 1349 caracteres

```
Piqo is the social football prediction game to play with your friends: create a group, predict every matchday and let the table decide who rules. Free, no real money and no betting.

THREE WAYS TO PLAY
• 1X2 picks: choose home win, draw or away win.
• Exact score: nail the result (5 points for the exact score, 2 if you only get the winner or the draw).
• Matchday quiz: answer questions about each league's games and compete with the whole community, even without a group.

YOUR GROUP, YOUR RULES
• Create a private group with an invite code or join a public one.
• Choose the competitions: the big European leagues and the Champions League.
• Weekly and overall tables, including the standings of every previous matchday.
• Comeback wildcard: an extra boost for whoever is behind.

BANTER, STREAKS AND ACHIEVEMENTS
• Streaks, badges, levels and season trophies.
• Avatars and mascots that unlock as you level up.
• Pick your favourite team and show its flag on your profile.
• Share your predictions and results as images, ready for the group chat.
• Reminders before the matchday closes so you never forget to predict.

IT ALL STAYS BETWEEN YOU
Points and badges have no monetary value and can't be exchanged for prizes. Piqo is just fun and friendly rivalry with your people.

Available in English, Spanish, Catalan, French, Italian and German.
```

**Novedades de esta versión (máx. 4000)** — 2777 caracteres

```
• NEW GAME MODE: QUIZ! Answer questions about each league's games and compete with the whole community, even without a group. Find it at the bottom right; your Profile is still behind your avatar.
• Quiz notifications, if you want them: when it opens, 24 hours before it closes and 1 hour before. Turn them on in Profile > Settings > Notifications.
• In Table, a line chart shows how you and the group leaders are doing matchday by matchday, in Weekly and Total. Tap "You" to see just yours.
• In exact-score groups, Table crowns the exact score king: who has nailed the most scores in the matchday and overall.
• You can now use the app in Catalan, French, Italian and German: choose the language in Profile > Settings > Language.
• In the group comparison, exact scores now show in gold so you can tell them apart from correct winners.
• When you type an exact score, the screen scrolls up so the last match isn't hidden behind the keyboard.
• When a matchday ends, Matchday now shows the next one if it is already open, even if a result is still missing or a match was postponed or cancelled.
• You can change your prediction for a postponed or cancelled match until it is played.
• Matchday-finished and matches-to-predict notifications now say which group and league they are about, and the matchday one makes clear the points are your total for the whole matchday.
• Fix: the level-up notice now appears only once.
• Share images use short team names ("Barça", "Atleti") so they no longer get cut off.
• Table: in Weekly you can pick a matchday (MD1, MD2…) of each league to see what was scored in it.
• Matches without a confirmed time now show "Time to be confirmed" instead of 2:00 AM, and the time updates by itself once it is confirmed.
• Fix: the badge counter now counts distinct badges, not the same one repeated in every group.
• Pick your favorite team in Profile > Settings: its flag, in the club colors, shows on your profile for anyone who visits it.
• When creating your account you can also continue with Google or Apple, just like when signing in.
• Every screen now opens from the top instead of staying where you were on the previous one.
• New Settings screen in your Profile, with a tab for each thing: name, team, notifications, appearance, language and password.
• New Quiz history: in Statistics, yours and other players’, see every closed quiz with what was answered and whether it was right, and filter by league.
• The Table chart now also shows in "General": it puts the matchdays of every league in date order (MD1 La Liga, MD1 Champions, MD2 La Liga...).
• Tap any player, in the Quiz or in Table, to see their profile: their flag, hits and misses in groups, streak, exact scores nailed, Quiz position with their history, badges and trophies.
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

**Texto promocional (máx. 170)** — 145 caracteres

```
New: Matchday quiz. Create your group, make your picks every matchday and let the standings decide who rules. Free, no real money and no betting.
```

**Descripción (máx. 4000)** — 1365 caracteres

```
Piqo is the social soccer prediction game to play with your friends: create a group, make your picks every matchday and let the standings decide who rules. Free, no real money and no betting.

THREE WAYS TO PLAY
• 1X2 picks: choose home win, draw or away win.
• Exact score: nail the result (5 points for the exact score, 2 if you only get the winner or the draw).
• Matchday quiz: answer questions about each league's games and compete with the whole community, even without a group.

YOUR GROUP, YOUR RULES
• Create a private group with an invite code or join a public one.
• Choose the competitions: the big European leagues and the Champions League.
• Weekly and overall standings, including the results of every previous matchday.
• Comeback wildcard: an extra boost for whoever is behind.

TRASH TALK, STREAKS AND ACHIEVEMENTS
• Streaks, badges, levels and season trophies.
• Avatars and mascots that unlock as you level up.
• Pick your favorite team and show its flag on your profile.
• Share your picks and results as images, ready for the group chat.
• Reminders before the matchday closes so you never forget to make your picks.

IT ALL STAYS BETWEEN YOU
Points and badges have no monetary value and can't be exchanged for prizes. Piqo is just fun and friendly rivalry with your people.

Available in English, Spanish, Catalan, French, Italian and German.
```

**Novedades de esta versión (máx. 4000)** — 2777 caracteres

```
• NEW GAME MODE: QUIZ! Answer questions about each league's games and compete with the whole community, even without a group. Find it at the bottom right; your Profile is still behind your avatar.
• Quiz notifications, if you want them: when it opens, 24 hours before it closes and 1 hour before. Turn them on in Profile > Settings > Notifications.
• In Table, a line chart shows how you and the group leaders are doing matchday by matchday, in Weekly and Total. Tap "You" to see just yours.
• In exact-score groups, Table crowns the exact score king: who has nailed the most scores in the matchday and overall.
• You can now use the app in Catalan, French, Italian and German: choose the language in Profile > Settings > Language.
• In the group comparison, exact scores now show in gold so you can tell them apart from correct winners.
• When you type an exact score, the screen scrolls up so the last match isn't hidden behind the keyboard.
• When a matchday ends, Matchday now shows the next one if it is already open, even if a result is still missing or a match was postponed or cancelled.
• You can change your prediction for a postponed or cancelled match until it is played.
• Matchday-finished and matches-to-predict notifications now say which group and league they are about, and the matchday one makes clear the points are your total for the whole matchday.
• Fix: the level-up notice now appears only once.
• Share images use short team names ("Barça", "Atleti") so they no longer get cut off.
• Table: in Weekly you can pick a matchday (MD1, MD2…) of each league to see what was scored in it.
• Matches without a confirmed time now show "Time to be confirmed" instead of 2:00 AM, and the time updates by itself once it is confirmed.
• Fix: the badge counter now counts distinct badges, not the same one repeated in every group.
• Pick your favorite team in Profile > Settings: its flag, in the club colors, shows on your profile for anyone who visits it.
• When creating your account you can also continue with Google or Apple, just like when signing in.
• Every screen now opens from the top instead of staying where you were on the previous one.
• New Settings screen in your Profile, with a tab for each thing: name, team, notifications, appearance, language and password.
• New Quiz history: in Statistics, yours and other players’, see every closed quiz with what was answered and whether it was right, and filter by league.
• The Table chart now also shows in "General": it puts the matchdays of every league in date order (MD1 La Liga, MD1 Champions, MD2 La Liga...).
• Tap any player, in the Quiz or in Table, to see their profile: their flag, hits and misses in groups, streak, exact scores nailed, Quiz position with their history, badges and trophies.
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

**Texto promocional (máx. 170)** — 150 caracteres

```
Nou: Quiz de jornada. Crea el teu grup, pronostica cada jornada i que la classificació decideixi qui mana. Gratis, sense diners reals i sense apostes.
```

**Descripción (máx. 4000)** — 1426 caracteres

```
Piqo és el joc social de pronòstics de futbol per jugar amb els teus amics: creeu un grup, pronostiqueu cada jornada i la classificació decideix qui mana. Gratis, sense diners reals i sense apostes.

TRES MANERES DE JUGAR
• Quiniela 1X2: tria local, empat o visitant.
• Resultat exacte: encerta el marcador (5 punts per l’exacte i 2 si només encertes el guanyador o l’empat).
• Quiz de jornada: respon preguntes sobre els partits de cada lliga i competeix amb tota la comunitat, encara que no tinguis grup.

EL TEU GRUP, LES TEVES REGLES
• Crea un grup privat amb codi d’invitació o uneix-te a un de públic.
• Tria les competicions: les grans lligues europees i la Champions League.
• Classificació setmanal i total, amb la classificació de cada jornada anterior.
• Comodí de remuntada: un cop de mà extra per a qui va per darrere.

PIQUES, RATXES I ÈXITS
• Ratxes, insígnies, nivells i trofeus de temporada.
• Avatars i mascotes que es desbloquegen en pujar de nivell.
• Tria el teu equip preferit i ensenya’n la bandera al teu perfil.
• Comparteix els teus pronòstics i resultats en imatges a punt per al xat del grup.
• Avisos abans que tanqui la jornada perquè no t’oblidis de pronosticar.

TOT ES QUEDA ENTRE VOSALTRES
Els punts i les insígnies no tenen valor monetari ni es poden bescanviar per premis. Piqo és només diversió i piques amb la teva gent.

Disponible en català, castellà, anglès, francès, italià i alemany.
```

**Novedades de esta versión (máx. 4000)** — 2793 caracteres

```
• NOU MODE DE JOC: QUIZ! Respon preguntes sobre els partits de cada lliga i competeix amb tota la comunitat, encara que no tinguis grup. El trobaràs a baix a la dreta; el teu Perfil continua al teu avatar.
• Avisos del Quiz, si els vols: quan s’obre, 24 hores abans del tancament i 1 hora abans. Activa’ls a Perfil > Ajustos > Avisos.
• A Taula, una gràfica de línies mostra com aneu tu i els primers del grup jornada a jornada, a Setmanal i a Total. Toca «Tu» per veure només la teva.
• Als grups de resultat exacte, Taula corona el rei del marcador exacte: qui ha clavat més marcadors a la jornada i en total.
• Ja pots fer servir l’app en català, francès, italià i alemany: tria l’idioma a Perfil > Ajustos > Idioma.
• A la comparativa del grup, els resultats exactes surten en daurat per distingir-los dels encerts de guanyador.
• En escriure un resultat exacte, la pantalla puja perquè l’últim partit no quedi tapat pel teclat.
• Quan s’acaba una jornada, a Jornada ja surt la següent si està oberta, encara que falti algun resultat o hi hagi un partit ajornat o cancel·lat.
• Pots canviar el teu pronòstic d’un partit ajornat o cancel·lat mentre no es jugui.
• Els avisos de jornada acabada i de partits per pronosticar diuen de quin grup i lliga són, i el de jornada acabada deixa clar que són els teus punts de tota la jornada.
• Arreglat: l’avís de pujada de nivell surt una sola vegada.
• Les imatges per compartir fan servir el nom curt dels equips («Barça», «Atleti») i ja no es retallen.
• Taula: a Setmanal pots triar una jornada (J1, J2…) de cada lliga per veure què es va puntuar en ella.
• Els partits sense hora confirmada mostren «Hora per confirmar» en lloc de les 2:00, i l’hora s’actualitza sola tan bon punt es confirma.
• Arreglat: el comptador d’insígnies compta les diferents, no les repetides a cada grup.
• Tria el teu equip preferit a Perfil > Ajustos: la seva bandera, amb els colors del club, surt al teu perfil i la veu qui el visiti.
• En crear el teu compte també pots continuar amb Google o Apple, igual que en iniciar sessió.
• Cada pantalla s’obre des de dalt, sense quedar-se on eres a l’anterior.
• Nova pantalla d’Ajustos al teu Perfil, amb una pestanya per a cada cosa: nom, equip, avisos, aparença, idioma i contrasenya.
• Nou Historial de Quiz: a Estadístiques, la teva i la d’altres jugadors, veus tots els quizzes tancats amb el que es va respondre i si es va encertar, i pots filtrar per lliga.
• La gràfica de Taula també surt a «General»: ajunta les jornades de totes les lligues per ordre de data (J1 Lliga, J1 Champions, J2 Lliga...).
• Toca qualsevol jugador, al Quiz o a Taula, per veure el seu perfil: la seva bandera, encerts i errors en grups, ratxa, marcadors exactes encertats, posició al Quiz amb el seu historial, insígnies i trofeus.
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

**Texto promocional (máx. 170)** — 147 caracteres

```
Nouveau : Quiz de la journée. Crée ton groupe, pronostique chaque journée et laisse le classement décider. Gratuit, sans argent réel et sans paris.
```

**Descripción (máx. 4000)** — 1522 caracteres

```
Piqo est le jeu social de pronostics de football à jouer entre amis : vous créez un groupe, vous pronostiquez chaque journée et le classement décide qui commande. Gratuit, sans argent réel et sans paris.

TROIS FAÇONS DE JOUER
• Pronostic 1X2 : choisis domicile, nul ou extérieur.
• Score exact : trouve le score (5 points pour le score exact, 2 si tu trouves seulement le vainqueur ou le nul).
• Quiz de la journée : réponds à des questions sur les matchs de chaque ligue et affronte toute la communauté, même sans groupe.

TON GROUPE, VOS RÈGLES
• Crée un groupe privé avec un code d’invitation ou rejoins un groupe public.
• Choisis les compétitions : les grands championnats européens et la Ligue des champions.
• Classement hebdomadaire et général, avec le classement de chaque journée passée.
• Joker remontada : un petit coup de pouce pour celui qui est derrière.

CHAMBRAGE, SÉRIES ET SUCCÈS
• Séries, badges, niveaux et trophées de saison.
• Avatars et mascottes à débloquer en montant de niveau.
• Choisis ton équipe préférée et affiche son drapeau sur ton profil.
• Partage tes pronostics et tes résultats en images prêtes pour la discussion du groupe.
• Des notifications avant la clôture de la journée pour ne pas oublier de pronostiquer.

TOUT RESTE ENTRE VOUS
Les points et les badges n’ont aucune valeur monétaire et ne peuvent pas être échangés contre des prix. Piqo, c’est juste du plaisir et de la rivalité amicale avec tes amis.

Disponible en français, espagnol, anglais, catalan, italien et allemand.
```

**Novedades de esta versión (máx. 4000)** — 3113 caracteres

```
• NOUVEAU MODE DE JEU : QUIZ ! Réponds à des questions sur les matchs de chaque ligue et affronte toute la communauté, même sans groupe. Il est en bas à droite ; ton Profil reste accessible depuis ton avatar.
• Notifications du Quiz, si tu le souhaites : à l’ouverture, 24 heures avant la clôture et 1 heure avant. Active-les dans Profil > Réglages > Notifications.
• Dans Classement, un graphique en lignes montre où vous en êtes, toi et les premiers du groupe, journée après journée, en Hebdo et en Total. Touche « Toi » pour ne voir que la tienne.
• Dans les groupes en score exact, Classement couronne le roi du score exact : qui a trouvé le plus de scores sur la journée et au total.
• Tu peux maintenant utiliser l’appli en catalan, français, italien et allemand : choisis la langue dans Profil > Réglages > Langue.
• Dans la comparaison du groupe, les scores exacts s’affichent en doré pour les distinguer des bons vainqueurs.
• Quand tu saisis un score exact, l’écran défile pour que le dernier match ne soit plus caché par le clavier.
• À la fin d’une journée, Journée affiche déjà la suivante si elle est ouverte, même s’il manque un résultat ou si un match a été reporté ou annulé.
• Tu peux modifier ton pronostic d’un match reporté ou annulé tant qu’il n’est pas joué.
• Les notifications de journée terminée et de matchs à pronostiquer indiquent le groupe et le championnat, et celle de fin de journée précise que ce sont tes points sur toute la journée.
• Correction : l’alerte de passage de niveau n’apparaît plus qu’une seule fois.
• Les images à partager utilisent le nom court des équipes (« Barça », « Atleti ») et ne sont plus coupées.
• Classement : dans Hebdo, tu peux choisir une journée (J1, J2…) de chaque compétition pour voir ce qui s’y est marqué.
• Les matchs sans heure confirmée affichent « Heure à confirmer » au lieu de 2 h 00, et l’heure se met à jour toute seule dès qu’elle est confirmée.
• Correction : le compteur de badges compte les badges distincts, plus les mêmes badges répétés dans chaque groupe.
• Choisis ton équipe préférée dans Profil > Réglages : son drapeau, aux couleurs du club, s’affiche sur ton profil, visible par ceux qui le visitent.
• En créant ton compte, tu peux aussi continuer avec Google ou Apple, comme à la connexion.
• Chaque écran s’ouvre désormais en haut, sans rester là où tu étais sur le précédent.
• Nouvel écran Réglages dans ton Profil, avec un onglet pour chaque chose : nom, équipe, notifications, apparence, langue et mot de passe.
• Nouvel historique du Quiz : dans Statistiques, le tien et celui des autres joueurs, tu vois tous les quiz clos avec les réponses données et si elles étaient bonnes, et tu peux filtrer par ligue.
• Le graphique de Classement apparaît aussi dans « Général » : il met les journées de toutes les ligues par ordre de date (J1 Liga, J1 Champions, J2 Liga...).
• Touche n’importe quel joueur, dans le Quiz ou dans Classement, pour voir son profil : son drapeau, ses réussites et ses erreurs en groupes, sa série, ses scores exacts trouvés, sa position au Quiz avec son historique, ses badges et ses trophées.
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

**Texto promocional (máx. 170)** — 166 caracteres

```
Novità: Quiz della giornata. Crea il tuo gruppo, pronostica ogni giornata e lascia che la classifica decida chi comanda. Gratis, senza denaro reale e senza scommesse.
```

**Descripción (máx. 4000)** — 1441 caracteres

```
Piqo è il gioco social di pronostici di calcio da fare con i tuoi amici: create un gruppo, pronosticate ogni giornata e la classifica decide chi comanda. Gratis, senza denaro reale e senza scommesse.

TRE MODI DI GIOCARE
• Schedina 1X2: scegli casa, pareggio o ospite.
• Risultato esatto: azzecca il punteggio (5 punti per il risultato esatto, 2 se azzecchi solo il vincitore o il pareggio).
• Quiz della giornata: rispondi a domande sulle partite di ogni campionato e sfida tutta la community, anche senza gruppo.

IL TUO GRUPPO, LE VOSTRE REGOLE
• Crea un gruppo privato con codice d’invito o unisciti a uno pubblico.
• Scegli le competizioni: i grandi campionati europei e la Champions League.
• Classifica settimanale e totale, con la classifica di ogni giornata precedente.
• Jolly rimonta: una spinta in più per chi è rimasto indietro.

SFOTTÒ, SERIE E TRAGUARDI
• Serie, badge, livelli e trofei di stagione.
• Avatar e mascotte che si sbloccano salendo di livello.
• Scegli la tua squadra del cuore e mostra la sua bandiera sul tuo profilo.
• Condividi i tuoi pronostici e i risultati in immagini pronte per la chat del gruppo.
• Avvisi prima della chiusura della giornata, così non dimentichi di pronosticare.

TUTTO RESTA TRA VOI
I punti e i badge non hanno valore monetario e non si possono convertire in premi. Piqo è solo divertimento e sfottò tra amici.

Disponibile in italiano, spagnolo, inglese, catalano, francese e tedesco.
```

**Novedades de esta versión (máx. 4000)** — 2953 caracteres

```
• NUOVA MODALITÀ DI GIOCO: QUIZ! Rispondi a domande sulle partite di ogni campionato e sfida tutta la community, anche senza gruppo. Lo trovi in basso a destra; il tuo Profilo resta sul tuo avatar.
• Avvisi del Quiz, se li vuoi: quando si apre, 24 ore prima della chiusura e 1 ora prima. Attivali in Profilo > Impostazioni > Avvisi.
• In Classifica, un grafico a linee mostra come andate tu e i primi del gruppo giornata dopo giornata, in Settimanale e in Totale. Tocca «Tu» per vedere solo la tua.
• Nei gruppi a risultato esatto, Classifica incorona il re del risultato esatto: chi ne ha azzeccati di più nella giornata e in totale.
• Ora puoi usare l’app in catalano, francese, italiano e tedesco: scegli la lingua in Profilo > Impostazioni > Lingua.
• Nel confronto del gruppo, i risultati esatti appaiono in oro per distinguerli dai vincitori azzeccati.
• Quando scrivi un risultato esatto, la schermata scorre verso l’alto così l’ultima partita non resta coperta dalla tastiera.
• Quando finisce una giornata, in Giornata compare già la successiva se è aperta, anche se manca un risultato o una partita è stata rinviata o annullata.
• Puoi cambiare il tuo pronostico di una partita rinviata o annullata finché non si gioca.
• Gli avvisi di giornata conclusa e di partite da pronosticare indicano il gruppo e il campionato, e quello di fine giornata chiarisce che sono i tuoi punti di tutta la giornata.
• Correzione: l’avviso di salita di livello compare una sola volta.
• Le immagini da condividere usano il nome breve delle squadre («Barça», «Atleti») e non vengono più tagliate.
• Classifica: in Settimanale puoi scegliere una giornata (G1, G2…) di ogni campionato per vedere i punti fatti in quella giornata.
• Le partite senza orario confermato mostrano «Orario da confermare» invece delle 2:00, e l’orario si aggiorna da solo appena viene confermato.
• Correzione: il contatore dei badge conta quelli diversi, non quelli ripetuti in ogni gruppo.
• Scegli la tua squadra del cuore in Profilo > Impostazioni: la sua bandiera, con i colori del club, appare sul tuo profilo e la vede chi lo visita.
• Quando crei il tuo account puoi anche continuare con Google o Apple, come all’accesso.
• Ogni schermata si apre dall’alto, senza restare dov’eri nella precedente.
• Nuova schermata Impostazioni nel tuo Profilo, con una scheda per ogni cosa: nome, squadra, avvisi, aspetto, lingua e password.
• Nuovo storico dei Quiz: in Statistiche, il tuo e quello degli altri giocatori, vedi tutti i quiz chiusi con le risposte date e se erano giuste, e puoi filtrare per campionato.
• Il grafico di Classifica compare anche in «Generale»: mette in ordine di data le giornate di tutti i campionati (G1 Liga, G1 Champions, G2 Liga...).
• Tocca qualsiasi giocatore, nel Quiz o in Classifica, per vedere il suo profilo: la bandiera, esatte e sbagliate nei gruppi, la serie, i risultati esatti azzeccati, la posizione nel Quiz con lo storico, i badge e i trofei.
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

**Texto promocional (máx. 170)** — 141 caracteres

```
Neu: Spieltags-Quiz. Gründe deine Gruppe, tippe jeden Spieltag und lass die Tabelle entscheiden. Kostenlos, ohne echtes Geld und ohne Wetten.
```

**Descripción (máx. 4000)** — 1498 caracteres

```
Piqo ist das soziale Fußball-Tippspiel für dich und deine Freunde: Ihr gründet eine Gruppe, tippt jeden Spieltag und die Tabelle entscheidet, wer das Sagen hat. Kostenlos, ohne echtes Geld und ohne Wetten.

DREI SPIELMODI
• 1X2-Tipp: Heimsieg, Unentschieden oder Auswärtssieg.
• Exaktes Ergebnis: Triff das genaue Ergebnis (5 Punkte für das exakte Ergebnis, 2 Punkte, wenn nur der Sieger oder das Unentschieden stimmt).
• Spieltags-Quiz: Beantworte Fragen zu den Spielen jeder Liga und miss dich mit der ganzen Community, auch ohne Gruppe.

DEINE GRUPPE, EURE REGELN
• Gründe eine private Gruppe mit Einladungscode oder tritt einer öffentlichen bei.
• Wähle die Wettbewerbe: die großen europäischen Ligen und die Champions League.
• Wochen- und Gesamttabelle, dazu die Tabelle jedes vergangenen Spieltags.
• Comeback-Joker: ein Extra-Schub für alle, die hinten liegen.

SPRÜCHE, SERIEN UND ERFOLGE
• Serien, Abzeichen, Level und Saison-Trophäen.
• Avatare und Maskottchen, die du mit steigendem Level freischaltest.
• Wähle dein Lieblingsteam und zeig seine Flagge auf deinem Profil.
• Teile deine Tipps und Ergebnisse als Bilder, bereit für den Gruppenchat.
• Erinnerungen vor Tippschluss, damit du nie vergisst zu tippen.

ALLES BLEIBT UNTER EUCH
Punkte und Abzeichen haben keinen Geldwert und lassen sich nicht gegen Preise eintauschen. Piqo ist einfach Spaß und freundschaftliche Rivalität mit deinen Leuten.

Verfügbar auf Deutsch, Spanisch, Englisch, Katalanisch, Französisch und Italienisch.
```

**Novedades de esta versión (máx. 4000)** — 3166 caracteres

```
• NEUER SPIELMODUS: QUIZ! Beantworte Fragen zu den Spielen jeder Liga und miss dich mit der ganzen Community, auch ohne Gruppe. Du findest es unten rechts; dein Profil erreichst du weiter über deinen Avatar.
• Quiz-Mitteilungen, wenn du sie willst: beim Öffnen, 24 Stunden und 1 Stunde vor Schluss. Schalte sie unter Profil > Einstellungen > Mitteilungen ein.
• In der Tabelle zeigt ein Liniendiagramm Spieltag für Spieltag, wie es dir und der Spitze der Gruppe läuft, in Woche und Gesamt. Tippe auf „Du“, um nur deine zu sehen.
• In Gruppen mit exaktem Ergebnis kürt die Tabelle den König der exakten Ergebnisse: wer am Spieltag und insgesamt die meisten getroffen hat.
• Du kannst die App jetzt auf Katalanisch, Französisch, Italienisch und Deutsch nutzen: Wähle die Sprache unter Profil > Einstellungen > Sprache.
• Im Gruppenvergleich werden exakte Ergebnisse jetzt in Gold angezeigt, damit du sie von richtigen Siegertipps unterscheiden kannst.
• Wenn du ein exaktes Ergebnis eingibst, scrollt der Bildschirm nach oben, damit das letzte Spiel nicht von der Tastatur verdeckt wird.
• Wenn ein Spieltag vorbei ist, zeigt Spieltag schon den nächsten, sobald er offen ist, auch wenn noch ein Ergebnis fehlt oder ein Spiel verschoben oder abgesagt wurde.
• Du kannst deinen Tipp für ein verschobenes oder abgesagtes Spiel ändern, solange es nicht gespielt wurde.
• Die Mitteilungen zu beendeten Spieltagen und offenen Tipps zeigen jetzt Gruppe und Liga, und die zum Spieltagsende macht klar, dass es deine Punkte für den ganzen Spieltag sind.
• Behoben: Die Meldung zum Level-Aufstieg erscheint jetzt nur noch einmal.
• Die Bilder zum Teilen nutzen die Kurznamen der Teams („Barça“, „Atleti“) und werden nicht mehr abgeschnitten.
• Tabelle: Unter „Woche“ kannst du für jede Liga einen Spieltag (ST1, ST2…) auswählen und sehen, was dort gepunktet wurde.
• Spiele ohne bestätigte Uhrzeit zeigen „Uhrzeit offen“ statt 2:00 Uhr, und die Zeit aktualisiert sich von selbst, sobald sie feststeht.
• Behoben: Der Abzeichen-Zähler zählt jetzt verschiedene Abzeichen und nicht dasselbe Abzeichen in jeder Gruppe mehrfach.
• Wähle unter Profil > Einstellungen dein Lieblingsteam: Seine Flagge in den Vereinsfarben erscheint auf deinem Profil und ist für alle sichtbar, die es besuchen.
• Beim Erstellen deines Kontos kannst du auch mit Google oder Apple fortfahren, genau wie beim Anmelden.
• Jeder Bildschirm öffnet sich jetzt oben, statt dort zu bleiben, wo du auf dem vorherigen warst.
• Neuer Einstellungsbildschirm in deinem Profil, mit einem Tab für jedes Thema: Name, Team, Mitteilungen, Darstellung, Sprache und Passwort.
• Neu: Quiz-Verlauf. In den Statistiken, deinen und denen anderer Spieler, siehst du alle beendeten Quizze mit den Antworten und ob sie richtig waren, und kannst nach Liga filtern.
• Das Diagramm in der Tabelle gibt es jetzt auch unter „Gesamt“: Es ordnet die Spieltage aller Ligen nach Datum (ST1 Liga, ST1 Champions, ST2 Liga ...).
• Tippe auf einen beliebigen Spieler, im Quiz oder in der Tabelle, um sein Profil zu sehen: Flagge, Treffer und Fehler in Gruppen, Serie, getroffene exakte Ergebnisse, Quiz-Platz mit Verlauf, Abzeichen und Pokale.
```
