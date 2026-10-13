# Decisiones

## 2026-10-13 — Sin escudos de clubes ni logos de competiciones

El usuario preguntó si usar los escudos en el Quiz infringía derechos. Son marcas registradas y obras con
copyright de cada club; que el proveedor (football-data.org) nos dé la URL no da derecho a usarlas, y Apple
(5.2.1) puede rechazar o retirar la app si un titular se queja. Decisión: no mostrar escudos ni logos de
competiciones en ninguna pantalla mientras no haya licencia; nombres de equipos y resultados sí (uso
descriptivo de datos). Para competiciones se usan los trofeos propios de Piqo.

## 2026-10-13 — Colores de los clubes en el Quiz, en un mapa estático

Para sustituir el escudo se usan solo los colores del club (dato descriptivo, no la marca gráfica). Se guardan en
un mapa estático del frontend en vez de en la BD: los partidos solo guardan nombres como texto, el endpoint de
partidos no devuelve colores y una columna nueva obligaría a migrar MySQL (prod) y Postgres (dev). Coste: al
cambiar de temporada hay que añadir los equipos nuevos a mano (releer `clubColors` y regenerar el mapa).

## 2026-10-13 — Equipo favorito: catálogo en el backend y solo nombres validados

El favorito se guarda como el nombre completo del equipo y el servidor solo acepta los del catálogo
(`users/team-catalog.ts`): se muestra a otros usuarios, así que un texto libre permitiría meter cualquier cosa en el
perfil de alguien. El backend manda ya resueltos los colores, y el frontend los pinta sin tener su propio mapa. El
Quiz sigue con su mapa estático (`team-colors.ts`), por lo que los colores de un equipo están en dos sitios; si molesta,
el Quiz puede leer el mismo catálogo. Equipos nuevos (ascensos, otra temporada) se añaden a mano a ambos.

## 2026-10-13 — Tabla arranca en la primera liga, no en «General» (sustituye a «Solo por competición»)

Con varias ligas, Tabla arrancaba en «General», que no tiene gráfica de evolución ni selector de jornada, y Semanal saltaba a la
primera liga sin que Total volviera: el mismo «Total» enseñaba cosas distintas según el camino. Ahora se entra en la primera liga
(la gráfica sale siempre) y General sigue a un toque en las pestañas; Total devuelve a General solo a quien venía de General. La
gráfica sigue siendo por liga (no hay jornadas comunes), esa parte de la decisión anterior se mantiene.

## 2026-10-13 — Gráfica de «General»: jornadas de todas las ligas por fecha

La decisión «Solo por competición» se matiza: «General» tampoco tiene jornadas comunes, pero sí fechas. Se ordenan por fecha las
jornadas finalizadas de todas las ligas del grupo y cada punto es una jornada de una liga (número + liga). El selector de
jornada sigue siendo solo por liga. Coste: una petición de historial por liga al entrar en General.

## 2026-10-13 — El historial de Quiz de un jugador lo ve cualquier jugador (sustituye a «solo quien comparte grupo»)

Primero el historial solo se veía el propio o el de quien comparte grupo. Al poder abrir el perfil de cualquier jugador desde la
clasificación del Quiz (que es de toda la comunidad) esa restricción dejaba fuera a casi todos. Ahora lo ve cualquier jugador
autenticado: son solo respuestas a preguntas de fútbol de quizzes ya cerrados (nunca de uno abierto, para no destaparlas), y el nombre
y los puntos ya eran públicos en la clasificación. Si más adelante se quiere privacidad, el sitio es `QuizService.history`.

## 2026-10-13 — Pulsar a un jugador abre su perfil general (no una vista del Quiz ni del grupo)

Desde la clasificacion del Quiz y desde Tabla se abre `/player/:userId`: un perfil unico por jugador con grupos, Quiz, insignias,
trofeos y bandera. El detalle de miembro de un grupo (`/groups/:groupId/members/:userId`) sigue existiendo, pero se llega desde
«Grupos en común» del perfil general. Privacidad: de los grupos solo se enseñan los que compartes con el jugador; el resto del perfil
(aciertos agregados, racha, Quiz, insignias) y el historial de quizzes cerrados lo ve cualquier jugador. Coste: Tabla ya no abre
directamente los pronósticos de la ultima jornada del jugador.

Decisiones de producto o técnicas tomadas durante la implementación del
roadmap, con su motivo. Las decisiones sustituidas se marcan como tales
(no se borran, para conservar el porqué de cada cambio de rumbo).

## 2026-10-12 — Quiz global por jornada (fuera de sprint)

El usuario pide un evento independiente de los grupos con preguntas variadas, equipos destacados,
clasificación general y por liga, acceso desde la pestaña inferior derecha y cierre al empezar el
primer partido de cada jornada. Plan y contrato: `quiz-jornada-plan.md`. Codex implementa servidor;
Opus implementa interfaz y traducciones frontend. No se cambia el contrato unilateralmente.

Decisiones de implementación siguiendo el plan propuesto: hasta diez partidos reales de una sola
jornada, normalmente diez preguntas (ocho si solo hay un partido), 1 punto por acierto, empates de
clasificación con posición compartida y suma por temporada. General suma todas las ligas, por lo
que jugar varias ofrece más oportunidades de puntos. Sin grupo obligatorio, XP ni comodines.

Preguntas, participaciones y respuestas se guardan separadas de las quinielas de grupo. Una sola
publicación por Matchday; preguntas fijas para todos. Partidos obligatorios Barcelona/Real Madrid/
Liverpool primero; aliases exactos normalizados con el esquema actual. Apertura reutiliza la regla
de habilitación existente, pero el cierre usa TODA la jornada y queda persistido irreversible.
El guardado se valida bajo bloqueo de fila del evento y vuelve a comprobar el plazo al finalizar.

Marcadores en directo no puntúan; aplazados esperan y cancelados se anulan sin puntos. La corrección
recalcula totales, nunca los incrementa al repetir el job. Los procesos mantienen ligas aunque nadie
las tenga en un grupo. Conference queda fuera por el placeholder 0 del catálogo. La cola de API es
compartida con los grupos y limita solicitudes dentro de un proceso; varias réplicas necesitan una
coordinación adicional si comparten clave. Correcciones automáticas de finales: ventana de siete días.

La migración se ha aplicado únicamente a una base MySQL de pruebas local aislada. No se ha desplegado
ni aplicado a la base habitual. Detalles y comprobaciones en `quiz-jornada-backend-handoff.md`.

## 2026-10-12 — Tabla: gráfica de líneas del grupo y "Rey del marcador exacto" (fuera de sprint)

Petición explícita del usuario: en Tabla, por defecto, una gráfica de líneas con la evolución de los puntos
de los jugadores por jornada (un color por jugador), con un botón para cambiar a la gráfica individual de
barras de antes; también en Semanal (antes allí no había gráfica). Además, en los grupos de resultado
exacto, un "Rey del marcador exacto" con cuántos exactos ha clavado cada uno en la semana o en total.
Referencia visual del usuario: una gráfica "Evolución de posiciones" con "líderes + tú".

**Cómo funciona**
- Backend: el historial (`GET /groups/:id/rankings/history`) manda además `scores` por jornada (puntos de
  cada jugador, de los `RankingSnapshot` semanales que ya leía). Endpoint nuevo
  `GET /groups/:id/rankings/exact-scores?period&scope&matchdayId` (`RankingsService.getExactScoreLeaders`).
- Frontend: `EvolutionChartComponent` (SVG propio, sin librerías) y la lógica en `RankingsPageFacade`
  (`groupChart`, `evolutionMode`, `exactLeaders`...).

**Decisiones tomadas por defecto (a confirmar por el usuario):**
1. **Puntos, no posiciones**: el usuario pidió "evolución de los puntos" (la referencia era de posiciones).
   En Total la línea es el **acumulado** tras cada jornada; en Semanal, los **puntos de cada jornada**.
   El acumulado sale de sumar las semanales de las jornadas finalizadas: si hay una jornada en juego,
   la tabla Total puede ir por delante de la última línea.
2. **Tú + 5 rivales como máximo** (los que van primero en el acumulado de la competición), como "líderes +
   tú" de la referencia: con más líneas no se distinguen. Son los mismos y con el mismo color en Semanal y
   en Total. Solo miembros actuales del grupo; quien no tiene puntos en una jornada cuenta 0.
3. **Últimas 8 jornadas** finalizadas que el grupo jugó (la de barras sigue con 6, como antes).
4. **Solo por competición**, como antes: en "General" no hay gráfica (no hay jornadas comunes).
5. La gráfica de grupo es la de por defecto **cada vez que se entra** (no se recuerda la elección).
6. En Semanal se resalta la jornada que se está viendo (en la de líneas y en la de barras).
7. **Rey del marcador exacto**: mismo alcance que la tabla (en Semanal, la jornada vista; en Total, el
   acumulado de la competición o de todo el grupo en "General"). Solo cuentan partidos **terminados**
   (igual que los puntos). Se ve el rey (o los reyes si empatan), los cuatro siguientes con algún
   exacto y tu fila si no estás entre ellos. Si nadie tiene ninguno, la tarjeta lo dice.
8. **Colores**: seis tokens `--p4-series-0..5` (0 = tú, el dorado de la marca), con claro y oscuro,
   en un orden validado para daltonismo entre vecinos.

**Compatibilidad**: el frontend nuevo con el backend viejo solo enseña la gráfica individual y no enseña
el rey del exacto (sin errores). Sin migración de base de datos.

## 2026-10-05 — Catalán, francés, italiano y alemán en toda la app (fuera de sprint)

Petición explícita del usuario: "¿podrías añadir catalán, francés, italiano y alemán?" (a la app entera:
interfaz, errores del servidor y correos). Ahora hay seis idiomas: es (original), en, ca, fr, it, de.

**Cómo funciona**
- **Elección y detección**: Perfil > Apariencia ofrece los seis (cada uno con su nombre: Español, English,
  Català, Français, Italiano, Deutsch). Sin elección guardada manda el primer idioma del dispositivo, con
  cualquier región (fr-CH, de-AT...); **cambio respecto a antes**: el catalán ya no cae en español (antes
  solo el inglés se distinguía); gallego, euskera, portugués... siguen en español.
- **Carga bajo demanda**: solo el español va en el paquete inicial; el catálogo del idioma elegido (~15 kB
  comprimidos) y los datos de fechas de Angular se descargan antes de arrancar la app
  (`core/i18n/language-loader.ts`, `main.ts` importa la app después). `translate.ts` guarda un registro de
  catálogos (`registerCatalog`); `t()` sigue siendo síncrono. Paquete inicial: 587 kB → 406 kB. Los tests
  registran todos los idiomas (`test-setup.ts`, tras `test-language.ts`, que fija el idioma antes de que
  se cargue `translate.ts`).
- **Backend**: `Locale` con seis valores; `resolveLocale` usa el primer idioma de `Accept-Language` si es uno
  de ellos. Errores en `common/i18n/messages/<idioma>.ts` (un fichero por idioma; el spec comprueba que
  cada mensaje del código está en todos) y correos en `mail/email-copy/<idioma>.ts`.
- **Historial de versiones**: `es` y `en` siguen siendo obligatorios; `ca/fr/it/de` son **opcionales** (si
  falta uno, el pop-up sale en inglés, `changeText`) para no cargar cada cambio futuro con cuatro
  traducciones. Las líneas existentes sí están en los seis. Los idiomas van **dentro de la 1.0.3** (la versión
  que se está enviando a la tienda; una primera versión de este cambio subió a 1.0.4 por error y se corrigió):
  `MARKETING_VERSION` = 1.0.3.
- **iOS**: `CFBundleLocalizations` lista los seis (así el sistema le pasa a la web view el idioma del
  móvil). El texto del permiso de seguimiento (`NSUserTrackingUsageDescription`) sigue en español.
- **Maquetación**: títulos (`h1`-`h3`) con `overflow-wrap: break-word` y `hyphens: auto` (alemán:
  "Mitteilungseinstellungen"). Recorrido de 19 pantallas por idioma a 375 px, buscando textos cortados,
  desbordes y claves sin traducir: solo salieron dos rótulos largos en alemán, acortados.

**Cómo se tradujo**: un traductor (agente) por idioma, partiendo del español y con el inglés como apoyo, con
glosario propio y registro informal ("tu", "du"); validación automática (mismas claves, mismos `{marcadores}`,
mismos saltos de línea, sin entidades HTML, forma `one` con `{count}` en francés porque allí el 0 es singular).
**Nadie nativo los ha revisado.** Decisiones de criterio que conviene que mire una persona de cada idioma:
- it: «Quiniela 1X2» → **Schedina** (boleto de apuestas en italiano, igual que "quiniela" en español);
  «Pica» → «Sfotti»; insignias reformuladas (In forma, Centurione, Pieno, Multicampionato, Instancabile).
- fr: «Semanal» → **Hebdo** (pestaña); «Quiniela 1X2» → Pronostic 1X2; «Pica» → «Chambre»; comodín → joker.
- de: «Quiniela» → 1X2-Tipp; comodín → Joker; abreviatura de jornada **ST** (Spieltag).
- ca: «piques» / «Pica’ls» (sin equivalente limpio); «Quiniela 1X2» se mantiene.
- Abreviaturas de jornada: J (ca, fr), G (it), ST (de), MD (en), J (es).
- Frases montadas con trozos (`soporte.*`, `authPage.continuar...`, `rulesAndPrizes.*`) revisadas en pantalla.

**Pendiente**: avisos push y de la pantalla "Avisos" (siguen en español; hace falta `users.locale`), el
dashboard (solo español), el permiso de seguimiento de iOS, y los textos de la ficha de la App Store (a mano).

## 2026-10-05 — Hora de los partidos: horas provisionales del proveedor (fuera de sprint)

Aviso del usuario: "en jornadas sale 11/10 a las 2 de la mañana en todos los partidos" (La Champions
salía bien).

**Causa** (comprobada con una respuesta real de la API, jornada 8 de La Liga, 2026-10-05: ya traía las
horas reales, estado `TIMED`, última actualización esa misma madrugada, y nuestra BD seguía con las
provisionales): cuando se importó la jornada la hora aún no estaba confirmada y llegó como las
**00:00:00 UTC** (las 2:00 en España), que la app tomó por real. Además `MatchdaysService.syncCurrentRound`
**no vuelve a pedir una jornada ya importada** (ahorro de cupo del plan gratuito, deliberado), así que
la hora provisional con la que entró el partido **no se corregía nunca**, aunque el proveedor la
confirmara después. La Champions salió bien porque ya tenía hora al importarse.

**Cómo queda**:
- **Backend** (arregla los datos para todas las versiones de la app, sin build): `refreshUnconfirmedKickoffs`
  (cron cada hora en `JobsService`) busca los partidos por jugar de jornadas abiertas/programadas cuya hora
  es exactamente las 00:00:00 UTC (`isKickoffTimeUnconfirmed`), los vuelve a pedir al proveedor
  (`getFixturesByIds`, 1 petición por cada 20) y corrige el `kickoff` y el cierre (`closesAt`) de la jornada
  si cambia el primer partido. No gasta cupo si no hay horas por confirmar.
- **Frontend** (necesita build): mientras la hora siga sin confirmar se enseña **«Hora por confirmar»** en
  vez de las 2:00, en Jornada y en la imagen de compartir (`isKickoffTimeTbc`).

**Matices a confirmar**: la detección es una heurística (ningún partido que seguimos se juega a las 00:00:00
UTC exactas; el proveedor no nos dice si la hora es provisional en lo que guardamos: `mapStatus` junta
`SCHEDULED` y `TIMED`); y **mientras la hora es provisional, la jornada se cierra a esa hora** (las 2:00 de
la madrugada del día del partido): si el proveedor no la confirma antes, se perdería el margen real para
pronosticar. Alternativa si preocupa: no cerrar un partido con hora provisional hasta el final de ese día.
Que cierre a la hora provisional también significa que la cuenta atrás "cierra en..." de Jornada es
orientativa hasta entonces.

## 2026-10-05 — Nombre corto de los equipos en las imágenes de compartir (fuera de sprint)

Petición explícita del usuario: "¿puedes usar el short name para el canvas de exportar resultados para
compartir?". football-data.org manda `shortName` ("Barça", "Atleti", "Santander") junto al nombre completo
("FC Barcelona", "Club Atlético de Madrid", "Real Racing Club de Santander"), que en la imagen de la
jornada se cortaba con puntos suspensivos.

- **Backend**: dos columnas nuevas en `matches`, `homeTeamShort` y `awayTeamShort` (`VARCHAR(191) NULL`),
  que se guardan al importar/refrescar un partido (`matchDataFromFixture`). Si el proveedor no da nombre
  corto se guarda el completo, para que el partido no cuente como "pendiente" y no se pida cada hora. Los
  partidos ya guardados se rellenan solos: `backfillTeamShortNames` (cron cada hora en `JobsService`) pide al
  proveedor 40 partidos por pasada, los más recientes primero (2 peticiones/hora como mucho; ninguna si no
  queda nada por rellenar).
- **Frontend** (necesita build): `shortTeamName(match, 'home' | 'away')` devuelve el nombre corto o, si el
  partido aún no lo tiene, el completo. Se usa en las dos imágenes de compartir: la de la jornada
  (pronósticos y resultados) y la de un partido (nombres, iniciales del círculo y rótulos 1/X/2). El resto
  de la app, y los textos que acompañan a la imagen al compartir, siguen con el nombre completo.

**MIGRACIÓN en la BD de producción — aplicarla ANTES de desplegar el backend**: Prisma pide todas las
columnas de `matches` en cada consulta, así que el backend nuevo sin las columnas falla en cualquier
consulta de partidos. La migración es aditiva y el backend actual la ignora, así que se puede aplicar
antes sin riesgo (`backend/prisma/migrations/20261005120000_match_team_short_names`):

```sql
ALTER TABLE `matches` ADD COLUMN `awayTeamShort` VARCHAR(191) NULL,
    ADD COLUMN `homeTeamShort` VARCHAR(191) NULL;
```

## 2026-10-05 — Tabla por jornadas: solo en Semanal, en orden J1, J2, J3 y con 0 puntos si no se jugó (fuera de sprint)

Petición explícita del usuario, tras probar la primera versión: "en total nunca debe salir el historial de
otras jornadas, y cuando sale, debe salir en orden cronológico (J1, J2, J3), y si esa jornada no se
jugaba, se le ponen todos 0 puntos y ya está". **Sustituye** las decisiones 1 (vale para semanal y total)
de la entrada siguiente.

- **Solo en Semanal**: en Total no hay selector y pasar a Total vuelve a la clasificación de ahora
  (`showMatchdayPicker` exige periodo semanal; `selectMatchday` no hace nada en Total).
- **Orden cronológico** (`matchdayChips`, por número de jornada ascendente): la elegida por defecto es la
  última, que queda a la derecha; la fila se desplaza para centrarla.
- **Jornada no jugada = todos a 0** (backend, `getRankingForMatchday`): quien no tiene fila en esa
  jornada (grupo creado después, nadie pronosticó, o jugador que entró después) sale con 0 puntos; los
  empates a 0 comparten puesto. Se listan los miembros actuales del grupo.

**Necesita build nueva** (frontend); lo de los 0 puntos lo da el backend al desplegar.

## 2026-10-05 — Tabla: clasificación de jornadas anteriores en cada liga (fuera de sprint)

Petición explícita del usuario: "en clasificación podrías ver la clasificación de cada semana; deberías
poder ver la clasificación de jornadas anteriores en cada liga".

**Cómo funciona** (solo frontend; el backend ya guardaba una foto por jornada y ya admitía
`?matchdayId=`): en Tabla, con una liga elegida, una fila de chips (`J6 J5 J4 J3`, la más nueva
primera) lista las jornadas ya finalizadas (la misma petición del historial que alimenta la gráfica de
evolución, una vez por grupo y liga). Elegir una pide la clasificación de esa jornada; elegir la última
vuelve a la vista de siempre. `RankingsPageFacade.selectMatchday`.

**Decisiones tomadas por defecto (a confirmar por el usuario):**

1. ~~Vale para Semanal y Total~~ — sustituido: ahora solo en Semanal (ver la entrada anterior, misma fecha).
2. **Solo por liga**: en "General" no hay selector. Cambiar de liga vuelve a la última jornada.
3. Viendo una jornada anterior **no se enseñan subidas/bajadas de puesto** (el backend no las calcula
   para una jornada concreta) y el resumen "Tú" dice "Jornada N" en vez de "Esta semana".
4. Tocar a un jugador abre sus quinielas **de esa jornada** (antes: de la última cerrada).
5. Solo salen las jornadas **finalizadas** (las que tienen foto de clasificación).

**Necesita build nueva** (frontend).

## 2026-10-05 — Teclado en iOS: la pantalla sube para que el último marcador no quede tapado (fuera de sprint)

Petición explícita del usuario: "al escribir el resultado exacto del último partido no se ve; al
abrirse el teclado debería subir toda la app para que se pudiera ver".

**Causa**: con `Keyboard.resize: 'none'` (capacitor.config.ts, decisión anterior para que la barra
inferior no suba con el teclado) el teclado se superpone sin mover nada, y el último campo de una
pantalla larga ya está al final de la página: no hay más página por la que subir. Además, en esta
app **no scrollea la ventana sino `<body>`** (html y body llevan `overflow-x: hidden`, lo que hace
que body, con `height: 100%`, sea el que desplaza por dentro), así que `window.scrollBy` no movía nada.

**Cómo queda** (`KeyboardInsetService`, solo iOS nativo): mientras el teclado está abierto pone un
hueco al final de la página del alto del teclado + barra "Listo" + margen (`--keyboard-inset`, regla
`html.keyboard-open app-root` en `styles.scss`) y sube el contenedor que de verdad hace scroll lo
justo para dejar el campo enfocado encima del teclado; también al pasar de un campo a otro con el
teclado ya abierto. Al cerrarse se quita el hueco. No toca `resize: 'none'`, así que la barra inferior
sigue sin subir. Android no cambia (su WebView sí se redimensiona).

**Esto SÍ necesita una build nueva de la app** (es frontend). Sale en la **1.0.3** junto con el arreglo del
pop-up de nivel (que ya funciona sin build, ver abajo): es la primera versión posterior a la 1.0.2, que
ya estaba cerrada.

## 2026-10-05 — El pop-up de "subiste de nivel" sale una sola vez, y lo deja leído el servidor (sustituye una regla de Sprint 14)

Petición explícita del usuario: "el pop-up de subida de nivel solo debería salir una vez, y si
le das a aceptar lo de notificaciones queda leído". Preguntó además si se podía evitar tocar el
frontend "para no lanzar una nueva build".

**Sustituye** lo dicho en Sprint 14 (el pop-up "no marca el aviso como leído; eso solo pasa al
pulsarlo en Avisos"): el pop-up lo abre el cliente cuando recibe un `LEVEL_UP` sin leer y solo
recordaba en memoria que ya lo había enseñado, así que en cada arranque volvía a salir mientras
nadie pulsara el aviso.

**Cómo queda** (solo backend, `NotificationsService.getFeedForUser`): `GET /notifications/me`
devuelve los `LEVEL_UP` sin leer como sin leer **esa vez** (el cliente abre el pop-up) y los
deja marcados como leídos en la base de datos. Efecto en la siguiente petición: ya no salen
como pop-up, no cuentan en la campanita, y el puntito rojo / la etiqueta "Recién desbloqueado"
de Perfil y del recorrido de niveles se apagan (dependen del mismo estado leído/no leído). Vale
para todas las versiones de la app ya instaladas, sin build nueva. Un fallo al marcarlos no tumba
el feed (lo peor: el pop-up vuelve a salir una vez más).

**Matices a confirmar**: se marca al **entregar** el aviso, no al pulsar "Aceptar" (si la app se
cierra con el pop-up abierto, ya queda leído); con dos dispositivos, lo ve el primero que abra la
app; y los puntos rojos de recompensa duran ahora hasta el siguiente refresco del feed (como mucho 2
min, o al abrir Avisos) en vez de hasta pulsar el aviso. Si se quisiera marcar exactamente al pulsar
"Aceptar", haría falta tocar el frontend (llamar a `markRead` en el cierre del pop-up).

## 2026-10-05 — Historial de versiones y pop-up de novedades (fuera de sprint)

A petición explícita del usuario ("añade siempre un historial con un control de
versiones para que, si abres la app después de actualizar, solo la primera vez con esa
versión, te salga un pop-up con una lista de cambios").

**Cómo funciona**: `core/changelog/changelog.ts` es el historial (de la versión más
nueva a la más antigua; cada cambio en español e inglés). `WhatsNewService` (lo llama
`ShellFacade.init`, ~2 s tras entrar) compara la versión instalada con la última para la
que ya decidió (`localStorage` `acerton.lastSeenVersion`, por dispositivo) y, si es nueva y
tiene entrada, abre `WhatsNewDialogComponent`. La versión se apunta **al abrir** el aviso,
no al cerrarlo, para que sea de verdad "solo la primera vez". La decisión es lógica pura y
con tests (`changelog.rules.ts`).

**Control de versiones**: la versión instalada es `App.getInfo().version` en la app nativa
(= `MARKETING_VERSION` en iOS) y, en la web, la última entrada del historial. Para que no
se rompa en silencio, `scripts/check-changelog.mjs` (paso de CI) exige que la entrada de
arriba tenga la misma versión que `MARKETING_VERSION`. La regla de mantenimiento (una
línea por cambio visible, en es y en) está en `CLAUDE.md`.

**Decisiones tomadas por defecto (a confirmar por el usuario):**

1. **Usuario nuevo** (sin tutorial hecho y sin versión guardada): no se le enseña nada, solo
   se apunta la versión. Un usuario que ya jugaba y actualiza desde una versión sin este aviso
   sí lo ve (con la entrada de la versión instalada).
2. **Se saltó una versión** (1.0.2 → 1.0.3): se enseñan las novedades de todas las del
   medio, con cabecera por versión. Sin versión guardada (usuario que ya jugaba y actualiza desde
   una versión sin este aviso) se cuenta desde la 1.0.1, la última sin pop-up
   (`LAST_VERSION_WITHOUT_WHATS_NEW`): quien pasa de la 1.0.1 a la 1.0.3 ve los cambios de la 1.0.2
   y de la 1.0.3 (cambiado el 2026-10-05 al subir a la 1.0.3; antes solo veía la instalada).
3. **Build más antigua que la guardada** (se reinstala una anterior): no sale nada y no se
   pisa la versión guardada.
4. **Versión sin entrada en el historial**: no sale nada (se apunta y se sigue).
5. **Android** no está alineado: su `versionName` es "1.0" y ninguna entrada coincide, así que
   no verá el pop-up hasta que se le ponga la misma versión que a iOS.
6. La entrada 1.0.2 resume lo visible desde 1.0.1 (inglés, copiar pronósticos, jornada siempre
   abierta, renombrar grupo, pestañas instantáneas, perfil/insignias) y se redactó a partir
   del historial de commits.

**No hecho**: una pantalla para volver a ver el historial después (p. ej. en Perfil).

## 2026-10-04 — Inglés en toda la app (fuera de sprint)

A petición explícita del usuario ("traducciones a inglés a toda la app").

**Cómo está hecho**: i18n propio, sin librerías (`frontend/src/app/core/i18n`).
`t(clave, params)` es TypeScript puro (lo usan también las reglas de dominio y las
constantes de módulo, que se evalúan al importar), con un pipe `t` para las
plantillas. `es.ts` define las claves y `en.ts` es un `Catalog` tipado: una clave
que falte o sobre no compila. Plurales `{ one, other }` por `count`
(`Intl.PluralRules`) y marcadores `{nombre}`. Las insignias se traducen en el
cliente por código (`shared/utils/badge-text.ts`); el backend las sigue guardando en
español y un código nuevo sin traducir cae a ese texto.

**Idioma**: el guardado en `localStorage` (`acerton.lang`) y, si no hay, el del
dispositivo. Cambiarlo guarda y **recarga** la app (así constantes, canvas de
compartir y formatos de fecha se reevalúan; evita tener que reaccionar a cambios de
idioma en caliente). `LOCALE_ID` y los datos de locale siguen el idioma (`es-ES` /
`en-GB`: fecha día/mes en los dos). El frontend manda `Accept-Language` (idioma de la
app, no el del navegador) solo a nuestra API (`language.interceptor.ts`).

**Backend**: los errores se siguen lanzando en español en cada servicio y un filtro
global (`common/i18n/localized-exception.filter.ts`) los devuelve en el idioma de la
petición con un diccionario (`error-messages.ts`); un test escanea el código y falla
si un mensaje nuevo no tiene traducción. Los dos correos transaccionales tienen
plantilla en los dos idiomas (`mail.service.ts`). **Sin migraciones.**

**Decisiones tomadas por defecto (a confirmar por el usuario):**

1. **Detección**: inglés solo si el dispositivo está en inglés; catalán, gallego y
   euskera se quedan en español (es el idioma principal de la app). Consecuencia:
   un usuario existente con el móvil en inglés verá la app en inglés tras actualizar,
   hasta que elija español.
2. **"Quiniela 1X2" → "1X2 Pool"** y "resultado exacto" → "Exact score"; "jornada"
   → "matchday" ("MD7" abreviado); "comodín" → "wildcard"; "pique" → "rivalry/banter";
   "avisos" → "notifications"; el lema "Pronostica. Pica. Repite." → "Predict.
   Banter. Repeat.".
3. **El selector está en Perfil > Apariencia** (junto al tema), no en una pantalla
   propia.
4. **Textos legales** (política de privacidad) traducidos al pie de la letra, sin
   revisión legal.
5. Pequeñas mejoras en español de paso: "desde oct 2026" ya sale con el mes en
   español (antes salía en inglés), tildes en las insignias y `aria-label` de
   pronóstico.

**Pendiente — avisos push y feed en inglés**: se generan en el servidor (cron y
eventos) sin petición de por medio, así que no hay `Accept-Language` que mirar.
Necesita guardar el idioma por usuario (propuesta: columna `users.locale`,
`VARCHAR(5) NOT NULL DEFAULT 'es'`, que el backend actualiza cuando la petición
autenticada llega con otro idioma) y generar el texto de cada aviso según el
idioma del destinatario. Implica una **migración** en la base de datos, por eso no
se ha hecho sin consultarlo. Los comunicados del dashboard los escribe una persona,
así que seguirían en el idioma en que se escriban.

**Peso**: los dos catálogos van dentro del bundle inicial (+~118 kB sin comprimir,
+~26 kB gzip; el bundle inicial pasa de 469 kB a 587 kB y supera el aviso de 512 kB
de `angular.json`). Se puede cargar solo el catálogo activo de forma perezosa si
molestara.

## 2026-10-04 — Copiar los pronósticos de la jornada de otro grupo

A petición explícita del usuario ("copiar lo que has puesto en otros grupos
para no ponerlo todo de nuevo; si luego quieres modificar algún resultado
puedes; que la opción ponga todos los partidos de esa jornada"). Un mismo
partido se pronostica por separado en cada grupo (`Prediction` es
`userId + groupId + matchId`), así que antes había que repetirlo grupo a grupo.

**Cómo funciona**: botón "Copiar pronósticos de otro grupo" en `/matchday`
(solo con más de un grupo y la jornada abierta). Elige el grupo de origen y el
backend (`POST /groups/:id/predictions/copy-from/:sourceId`, con
`GET .../copy-sources/:matchdayId` para listar candidatos) copia **todos** los
pronósticos que el origen tenga en esa jornada y sigan abiertos. Reutiliza
`submit()` partido a partido, así que valen las mismas reglas que al pronosticar
a mano (partido no empezado, jornada abierta, comodines del destino, XP de
participar) y lo copiado se edita después con el autoguardado normal.

**Decisiones tomadas por defecto (a confirmar por el usuario):**

1. **Sustituye lo que el destino ya tuviera de esos partidos** (no solo rellena
   huecos), porque el usuario pidió "que ponga todos los partidos". Si ya hay
   algo elegido, la pantalla pide confirmación antes. No toca los partidos que
   el origen no tiene pronosticados.
2. **Partidos ya empezados**: no se copian (no se puede pronosticar un partido
   que ha empezado) y se avisa.
3. **Comodín de remontada** (es de cada grupo: depende de la diferencia con el
   líder de ESE grupo): solo se copia si el destino tiene comodines disponibles.
   Sin comodín, una doble oportunidad (1X/X2/12) no tiene equivalente simple, así
   que ese partido **se omite y se avisa** (no se inventa una elección); un
   marcador con "x2 puntos" se copia **sin** el duplicador y se avisa. Cada
   comodín copiado gasta uno de los del destino, por orden de kickoff.
4. **Solo entre grupos del MISMO modo de puntuación** (1X2 con 1X2, resultado
   exacto con resultado exacto), corregido por el usuario tras una primera versión
   que además convertía un marcador en 1/X/2: ni de exacto a 1X2 ni de 1X2 a
   exacto. El backend rechaza con 400 un `copy-from` entre modos distintos.
   **El selector lista TODOS los otros grupos donde has marcado algo de esa
   jornada**, no solo los copiables (cambio posterior, a raíz de "solo me sale
   uno cuando tengo marcado en 3 grupos"): los que no se pueden copiar salen
   desactivados con el motivo (`unavailable`: `DIFFERENT_MODE` — nombra los dos
   modos — o `ALL_STARTED` — todos sus partidos ya empezaron). Antes esos grupos
   desaparecían sin explicación y parecía que faltaban.
5. **Solo grupos de los que sigue siendo miembro** y no eliminados, y solo si la
   jornada es de una competición activa del grupo de destino.
6. **XP**: como se reutiliza `submit()`, copiar a un grupo nuevo da la XP de
   participar de cada partido igual que pronosticarlo a mano allí (no abre un
   atajo que no existiera ya).

**No es atómico**: si un partido falla, los demás siguen y se informa en
`skipped`. No hay "deshacer" (se cambia a mano, como cualquier pronóstico).

## 2026-10-04 — Los anuncios a todos los usuarios solo salen del dashboard, con clave compartida

El botón "Probar notificaciones" (Sprint 9) ya no estaba en la app, pero su endpoint
`POST /notifications/test-broadcast` seguía abierto a cualquier usuario autenticado y
notificaba a todos los dispositivos. Se elimina y el envío masivo pasa a ser una
capacidad **exclusiva de piqo-dashboard**:

- **Clave compartida en cabecera** (`X-Dashboard-Key` ↔ `DASHBOARD_API_KEY`) en vez de un
  "rol admin" de usuario: la app no tiene concepto de administrador de plataforma y
  añadirlo exigiría migrar la BD de producción. El dashboard ya es un servicio de
  servidor con su propio login, así que puede guardar la clave sin exponerla.
- Desactivado por defecto: sin clave (o corta) el endpoint responde 503, nunca abierto.
- **Sin feed ni preferencias** (decisión de alcance, no técnica): un tipo nuevo de aviso
  exige migrar el enum en la BD de producción. Si se quiere que los anuncios aparezcan
  también en "Avisos", añadir `ANNOUNCEMENT` a `NotificationType` (migración + SQL para quien
  gestiona la BD) y llamar a `recordMany` desde `broadcastAnnouncement`.
- El dashboard deja de ser "solo lectura" en este único punto (su README lo refleja);
  sigue sin poder escribir en la BD (conexión MySQL de solo lectura).

## 2026-10-04 — Sin ventana de apertura de 4 días: la jornada más próxima siempre acepta pronósticos (sustituye una regla anterior)

Petición explícita del usuario: "siempre debe haber una jornada abierta para
pronosticar", manteniendo la lógica actual de cuál es la jornada más próxima.

**Sustituye** la regla de `PREDICTIONS_OPEN_BEFORE_MS` (4 días antes del primer
partido): su comentario decía expresamente que "cerrar una jornada no abre la
siguiente de golpe". Ahora sí: la jornada de referencia (próximo partido sin
terminar, decisión del 2026-09-19, **sin cambios**) está abierta siempre.
`PREDICTIONS_OPEN_BEFORE_MS` se conserva solo para calcular el `opensAt` nominal
de compatibilidad con apps ya instaladas.

**Lo que se mantiene**: no se pueden rellenar jornadas "del futuro" — una
jornada con número mayor que el límite sigue bloqueada ("Aún no"). El límite
(`predictLimitOrder`) es la jornada de referencia, o la del próximo partido por
empezar cuando a la de referencia solo le quedan partidos ya empezados (para
no dejar horas sin ninguna jornada abierta mientras acaba el último partido).

**Decisión de diseño**: se amplió el límite en vez de cambiar qué jornada se
muestra como "actual" — el usuario pidió mantener esa lógica tal cual. Mientras
el último partido de la jornada 7 está en juego se sigue viendo la 7 y la 8 se
puede pronosticar yendo a "siguiente".

**Riesgo conocido**: `ensureUpcomingMatchday` pide la siguiente ronda por número
(`order + 1`) al proveedor, igual que ya hacía la navegación "siguiente" bajo
demanda; solo se usa en rondas numeradas (`Regular Season - N`).

## 2026-10-04 — (Descartada) Mi versión del envío de comunicados desde el dashboard: sustituida por la de `main`

En paralelo a la implementación de arriba ("Los anuncios a todos los usuarios solo salen
del dashboard"), la sesión de la nube había construido otra versión del mismo envío
(`POST /api/admin/notifications/broadcast` + clave `ADMIN_API_KEY` en `Authorization:
Bearer`). Al fusionar con `main` se **descartó entera** (endpoint, guard, DTO, clave,
migración y formulario del dashboard) y se dejó la de `main`: ya estaba revisada,
fusionada y con las variables de entorno elegidas (`DASHBOARD_API_KEY`, `PIQO_API_URL`).
El diseño era casi idéntico; esto es lo que aportaba la mía y **no está en `main`**, por si
algún día interesa:

- **Un usuario concreto o un segmento** (activos 7 días / inactivos +14 días) además de
  "todos": el dashboard resolvía los ids con un `SELECT id FROM users ...` y los pasaba al
  backend en `userIds`. Sobre todo sirve para **probar con una sola cuenta antes de enviar
  a todo el mundo** (con la de `main` el primer envío real ya va a todos; lo único que
  protege es el `dryRun` y el pop-up de confirmación).
- **Aviso en la pantalla "Avisos"** de cada destinatario (tipo `ANNOUNCEMENT`, migración
  que amplía el `ENUM` de `notifications.type`). Misma decisión de alcance que arriba:
  exige migrar la BD de producción.
- **Envío por lotes de 500 dentro de `sendToTokens`** (afecta a todos los envíos, no solo al
  anuncio): en `main` solo `broadcastAnnouncement` lo hace, así que `sendToUsers` con más
  de 500 dispositivos (p. ej. un grupo muy grande en un recordatorio de cierre) sigue
  topando con el límite de FCM.


## 2026-10-04 — La rama `dev` NO se actualiza desde `main`: los cambios de API para dev se portan a mano

Descubierto al intentar arreglar un error del renombrado de grupo en dev
(el usuario confirmó que **la API de dev despliega desde la rama `dev`**):
`dev` sigue en **Postgres/Neon** (`provider = "postgresql"`, servicios
`piqo-dev`/`acerton-dev` contra Neon) y va 36+ commits por detrás de `main`,
que desde el 2026-09-29 es **MySQL** (Hostinger, ver memoria
`project-db-mysql-hostinger`). Hacer fast-forward de `dev` a `main` rompería
la API de dev (proveedor MySQL contra una URL de Neon) y exigiría migrar
la BD de dev.

**Consecuencia práctica**: un build de iOS con `environment=dev` lanzado desde
`main` habla con una API que no tiene el código de `main`; cualquier cambio de
API que se quiera probar en dev debe portarse (cherry-pick manual, solo
backend) a una rama cortada de `origin/dev` y fusionarse en `dev`. Así se hizo
con el renombrado de grupo (backport #71). Para probar contra la API completa
de `main` hay que usar el entorno de producción o resolver antes la BD de dev.

## 2026-09-19 — Sprint 5, "orden estable de jornadas por cierre de pronósticos" — resuelto, sustituye la decisión implícita anterior

El usuario resolvió con reglas y ejemplos concretos la pregunta que
`backlog.md`/`roadmap.md` tenían pendiente desde el 2026-09-10 ("necesita
datos reales de qué casos simultáneos aparecen"):

> Si aplazan un partido de la jornada 6 para dentro de 30 días, esa
> jornada se debe esconder y debe aparecer la jornada 7 (si su partido es
> el más próximo) como la jornada "actual" a mostrar/puntuar. La jornada 6
> no desaparece: se queda abierta para pronosticar/editar cuando se
> quiera. No hace falta que una jornada se cierre para que se abra otra —
> pueden quedar varias jornadas abiertas a la vez si sus ventanas se
> solapan en el tiempo. Cuando se acerque de nuevo la fecha real de la
> jornada 6, puede volver a ser "la actual" si vuelve a ser la de cierre
> más próximo entre las pendientes.

**Sustituye una decisión de diseño explícita ya implementada y testeada**:
`MatchdaysService.getCurrentMatchdayForCompetition` elegía la jornada "actual"
a mostrar por defecto por **número de orden más bajo** entre las no
finalizadas, deliberadamente distinto del criterio de **cierre más
próximo** (`closesAt`) que ya usaba `canAcceptPredictions`/
`attachCanPredict` para decidir qué se puede predecir — el comentario del
código explicaba explícitamente que confundir ambos criterios había sido
un bug anterior. Un test (`matchdays.service.spec.ts`) codificaba
literalmente el escenario contrario al que pide ahora el usuario (jornada
aplazada con número más bajo debía seguir siendo "la actual" aunque
cerrara más tarde que la siguiente). Confirmado explícitamente con el
usuario antes de tocar el test (ver pregunta con dos escenarios
equivalentes e invertidos) — no es una ambigüedad menor, es una reversión
de una regla de producto ya decidida.

**Implementado**: `getCurrentMatchdayForCompetition` pasa a ordenar por
`closesAt` ascendente en vez de `order` ascendente — mismo criterio que ya
usaba `getEarliestPendingOrder`, así que ambos conceptos ("jornada a
mostrar por defecto" y "jornada límite para aceptar pronósticos") quedan
unificados en vez de deliberadamente separados. No hizo falta tocar
`canAcceptPredictions`/`attachCanPredict`: su regla ya existente
(`matchday.order <= earliestPendingOrder`, con `earliestPendingOrder`
calculado por cierre más próximo) ya cubre exactamente el ejemplo
numérico del usuario sin cambios — una jornada aplazada con número más
bajo que la actual (por cierre) sigue pudiendo aceptar pronósticos, y una
jornada muy por delante (ej. la 12 en el ejemplo) sigue bloqueada hasta
que le toque. El caso general de "varias jornadas abiertas a la vez sin
que una tenga que cerrar" ya estaba cubierto por ese mismo mecanismo
(orden relativo al de cierre más próximo, más el margen individual de
`PREDICTIONS_OPEN_BEFORE_MS` de cada jornada) para el ejemplo dado — no se
ha tocado ni relajado ese mecanismo más allá de lo verificado con el
ejemplo concreto.

Test que codificaba la regla anterior reescrito con el ejemplo nuevo
(jornada 6 aplazada 30 días / jornada 7 más próxima). 281 tests del
backend en verde, `tsc --noEmit` limpio. Mergeado a `dev` vía PR
(github.com/MarcSagues/acerton/pull/33, checks requeridos `backend (tests
+ tsc)`/`frontend (build + tsc + karma)` en verde) — rama
`feature/current-matchday-by-closest-close` ya borrada tras el merge.
Issue #10 (Sprint 5) actualizado con la casilla marcada; el sprint sigue
en Status "New features" porque quedan tareas pendientes (estadísticas
por temporada, separar 1X2/resultado exacto, competiciones sin
retroactividad).

### 2026-09-19 (mismo día, tras probar en `dev`) — el fix anterior no bastaba: `closesAt` se queda "congelado" en el pasado

El usuario probó en `dev` y reportó "sigo viendo la jornada 6 en vez de la
7". Investigado contra la base de datos real de `dev` (rama de Neon
`br-misty-pond-za5lnxwp`, proyecto `soft-heart-48763185`): en La Liga, la
jornada 6 tiene 9 de sus 10 partidos `FINISHED` y el último (Levante–
Athletic) aplazado al **21 de octubre**; la jornada 7 tiene sus partidos
literalmente el 19-20 de septiembre (hoy/mañana en la fecha de esta
sesión). Cero pronósticos registrados en ningún grupo de prueba para los
partidos de la jornada 7.

**Causa raíz real**: `Matchday.closesAt` se fija al CREAR la jornada como
el kickoff de su PRIMER partido (3 de septiembre para la jornada 6) y
nunca se recalcula — aplazar un partido que no es el primero de la ronda
no lo mueve. El fix de la entrada anterior (ordenar por `closesAt`
ascendente) seguía comparando ese campo congelado: la jornada 6 "ganaba"
por tener un `closesAt` más antiguo (3 sept.) que el de la 7 (18 sept.),
aunque su único partido pendiente estuviera un mes por delante. Y como
`canAcceptPredictions` usaba el mismo campo para decidir el umbral de
jornadas que aceptan pronósticos, esto además **bloqueaba pronósticos
reales** de la jornada 7 (que sí estaba en curso) — no solo afectaba a qué
se mostraba por defecto.

**Confirmado con el usuario antes de ampliar el fix** (tocaba
`canAcceptPredictions`, no solo el display — más alcance del inicialmente
previsto): sustituir el criterio de `closesAt` fijo por el **kickoff del
próximo partido sin terminar (`status != FINISHED`) de cada jornada**,
recalculado sobre los partidos reales en cada consulta en vez de un campo
guardado. Nuevo método privado `MatchdaysService.getReferenceOrder`
(sustituye a `getEarliestPendingOrder`), usado tanto por
`getCurrentMatchdayForCompetition` como por `attachCanPredict`. Una
jornada deja de "competir" por esta posición en cuanto pasa a `FINISHED`
(todos sus partidos con resultado), así que ya no puede quedarse congelada
en el pasado.

Verificado con SQL directo contra los datos reales de `dev` antes de dar
el fix por bueno: con el nuevo criterio, la jornada 7 gana (próximo
partido hoy a las 12:00 UTC) y la 6 pasa al puesto que le corresponde por
urgencia real (21 de octubre, incluso por detrás de las jornadas 8 y 9).
Tests reescritos para mockear `findMany` en vez de `findFirst` (la nueva
consulta trae varias jornadas con sus partidos, no una sola por
`closesAt`), más un test nuevo que reproduce exactamente este escenario
real. 282 tests del backend en verde, `tsc --noEmit` limpio. Rama
`fix/matchday-reference-order-by-next-kickoff`.

## 2026-09-12 — Sprint 11 (Piqo Premium, monetización)

Precio decidido con el usuario tras analizar comparables directos
(Biwenger, Comunio — apps de quiniela/fantasy en español): **0,99 €/mes o
9,99 €/año**, deliberadamente por debajo de esos comparables (~3-5€/mes)
porque Piqo es más ligero (social + cosméticos, no un gestor completo de
fantasy) — precio de impulso, no de suscripción "seria". El plan anual da
~2 meses gratis frente al mensual, para empujar hacia el plan que más
retiene.

Alcance explícitamente cosmético/de conveniencia, no pay-to-win: quitar
anuncios, mascotas/fondos/marcos de avatar exclusivos, comodines extra,
histórico ampliado, grupos ilimitados, insignias/trofeos exclusivos,
icono/color de portada de grupo, notificaciones con más antelación.
Ninguna ventaja toca puntos, aciertos ni quién gana la quiniela — motivo:
mantener el posicionamiento legal/de marca ya fijado en el producto
("juego social gratuito, sin apuestas, sin dinero real") — cualquier
ventaja competitiva real de pago rompería esa promesa.

Bloqueo de partida para todo el sprint: no hay decisión tomada de cómo
implementar la suscripción (StoreKit/Play Billing directos vs. un
intermediario tipo RevenueCat) ni modelo `User.isPremium` en el backend —
ver primera fila de la tabla del sprint en `roadmap.md`.

## 2026-09-13 — Bug: push nunca llegaba en iPhone (app nativa)

El usuario reportó que las notificaciones push no llegaban en iPhone ni
siquiera usando el botón "Probar notificaciones" (Sprint 9, incremento 1).
Diagnóstico: tres fallos independientes en `frontend/ios/App`, cualquiera
ya bastaba para romper el pipeline entero:

1. Faltaba la entitlement `aps-environment` en `App.entitlements` — nunca
   se había activado la capacidad "Push Notifications" en Xcode/App ID.
2. `AppDelegate.swift` no reenviaba `didRegisterForRemoteNotifications*`
   al `NotificationCenter` que espera `@capacitor/push-notifications` — sin
   esto, ni `registration` ni `registrationError` llegaban nunca al JS
   (`enableNative()` se quedaba colgado para siempre, de ahí que "ni
   forzándolo con un botón" funcionara).
3. En iOS, `@capacitor/push-notifications` solo da el token crudo de APNs,
   no uno de FCM — y el backend envía todo vía
   `firebase-admin`/`sendEachForMulticast`, que exige un token de FCM.

Decisión (elegida por el usuario entre dos opciones): **integrar
FirebaseMessaging nativo en iOS** para traducir APNs→FCM, en vez de montar
una segunda vía de envío directo por APNs en el backend. Motivo: mantiene
un único pipeline de envío (el mismo `sendEachForMulticast` que ya sirve
web y Android), sin lógica adicional en el backend para distinguir tipos
de token.

Implementado: entitlement añadida, `AppDelegate.swift` reenvía el
registro APNs y configura Firebase, plugin nativo propio
`FcmTokenPlugin.swift` que expone el token de FCM a JS,
`PushNotificationsService.enableNative()` actualizado para usarlo en iOS
(Android no cambia — ahí `@capacitor/push-notifications` ya da un token de
FCM válido directamente). **Sin verificar en dispositivo real ni
compilado**: no hay Mac/Xcode disponible en esta sesión. Quedan pasos
manuales obligatorios antes de que esto pueda funcionar — ver
`backlog.md`.

## 2026-09-13 — Sprint 12 (Compartir resultados)

El usuario pidió compartir en Twitter/X con imagen adjunta y que "Copiar
resumen" copie una imagen en vez de texto. Decisión: **no integrar
directamente con la API de X/Twitter** para publicar el tweet — requeriría
OAuth propio (app registrada en su plataforma de desarrolladores) y acceso
de pago a su API de publicación, un coste desproporcionado frente al
beneficio de esta función. En su lugar, usar el share nativo del sistema
(`@capacitor/share` + `@capacitor/filesystem`, ninguno instalado hoy) con
una imagen adjunta: el propio selector de apps del sistema operativo deja
elegir X, WhatsApp, Mensajes, etc. — cubre el caso de uso real sin tocar
ninguna API externa de pago.

La imagen se genera dibujando a Canvas (Canvas API nativo) en vez de con
una librería de captura de DOM tipo html2canvas, por fiabilidad (esas
librerías dan problemas con fuentes/gradientes/sombras reales del diseño
de Piqo).

## 2026-09-10 — Sprint 5 (fin de temporada) — sustituye la decisión anterior

- **Sustituye la respuesta inicial** ("fecha fija configurable, ej. 1 de
  julio") dada a la pregunta "¿cómo detectamos que ha terminado la
  temporada de un grupo?". El usuario la corrigió con la regla real:

  > El final de temporada se tiene que calcular: cada liga termina una
  > fecha u otra. Si el grupo tiene Champions y Liga, el final de
  > temporada es el último partido que se juega entre las dos
  > competiciones; si solo tiene Champions, es la final de Champions. Si
  > ese partido se aplaza, tiene que poder recalcularse — se puede dar un
  > preview de cuándo termina, pero no se da por finalizada hasta hacer
  > el recuento del último partido; si ya no quedan más, se cierra la
  > temporada.

- **Diseño resultante** (por grupo, no global — cada grupo tiene sus
  propias competiciones activas y por tanto su propia fecha):
  - **Preview** (estimación, puede cambiar): para cada competición activa
    del grupo, se pide al proveedor el calendario completo de la
    temporada (`/competitions/{id}/matches?season=N`, sin filtrar por
    jornada — una sola petición, no una por jornada) y se guarda la fecha
    del partido más tardío conocido (`Competition.seasonEndPreviewAt`,
    refrescado periódicamente, no en cada petición, para no gastar cupo
    del plan gratuito). El preview del grupo es el máximo de esa fecha
    entre sus competiciones activas.
  - **Cierre real** (definitivo, no se reabre): se comprueba como parte
    del flujo que ya existe al finalizar una jornada
    (`MatchdaysService.syncResultsForClosedMatchdays` →
    `newlyFinished`). Cuando una jornada pasa a `FINISHED`, si su partido
    es (o iguala) el último conocido para su competición, se vuelve a
    consultar el calendario completo una vez más (por si se aplazó o
    añadió algo) antes de dar la competición por terminada. Cuando todas
    las competiciones activas del grupo están así de terminadas, se cierra
    la temporada del grupo (`GroupSeason.endedAt`).
  - Modelo nuevo `GroupSeason` (una fila por grupo y temporada, con
    `endedAt` null mientras está en curso) en vez de una tabla `Season`
    global: cada grupo puede tener conjuntos de competiciones distintos y
    por tanto fechas de cierre distintas. `RankingSnapshot` (y, en
    incrementos posteriores de este sprint, `Streak`/elegibilidad) se
    vincula a la temporada abierta del grupo en el momento de guardarse.
  - Añadir una competición nueva a un grupo sin temporada abierta (la
    anterior ya cerró) abre una temporada nueva en ese momento.

- **Alcance de este incremento del Sprint 5**: solo la base de temporada
  (modelo + detección de cierre + preview + `RankingSnapshot` vinculado).
  Elegibilidad, racha global y estadísticas agregadas quedan para
  incrementos posteriores del mismo sprint — decisión tomada por tamaño,
  confirmada con el usuario ("vamos por sprint 5 aunque sea más largo").

## 2026-09-10 — Sprint 4 (tutorial)

- **Sustituye la primera implementación del tutorial** (modal centrado de
  texto, `TutorialOverlayComponent`) por un recorrido guiado tipo
  "coach mark": cada paso resalta (spotlight) el elemento real de la
  interfaz al que se refiere, con una burbuja anclada junto a él, en vez
  de describirlo en texto suelto dentro de un cuadro genérico. Motivo
  (feedback explícito del usuario): "el tutorial debe ser dinámico sobre
  las opciones que hay, no solo texto". El paso que señala el botón
  "Jornada" avanza al detectar la navegación real a esa pantalla (el
  usuario pulsa el botón real), no con un botón "Siguiente" propio —
  sigue sin obligar a enviar ningún pronóstico real, que es lo único que
  `product-rules.md` prohíbe explícitamente.

## 2026-09-10 — Sprint 3 (roles y membresías)

- **Propietario como campo (`Group.ownerId`), no como rol nuevo.** Entre
  añadir `OWNER` a `GroupRole` o un campo `ownerId` directo en `Group`, el
  usuario eligió `ownerId` (opción recomendada): hace trivial "el creador
  nunca puede ser expulsado ni degradado" (comparar contra `ownerId`) sin
  tocar el enum de roles ni los sitios que ya distinguen ADMIN/MEMBER. El
  propietario mantiene además `role=ADMIN` en su `GroupMembership`, para
  que los chequeos de admin existentes (`assertIsAdmin`) seguían
  cubriéndolo sin cambios.
- **Borrado lógico (`Group.deletedAt`), no separar historial a otra
  tabla.** El usuario eligió borrado lógico (opción recomendada): cambio
  pequeño y de bajo riesgo, no toca las relaciones `onDelete: Cascade`
  existentes. Un grupo eliminado desaparece de `mine`/`public`/`findOne`/
  unirse por invitación, pero la fila y su historial (predicciones,
  rachas, insignias, clasificaciones) se conservan indefinidamente.
- **Backfill de `ownerId` para grupos existentes**: el admin más antiguo
  de cada grupo (`ORDER BY joinedAt ASC` entre sus `GroupMembership` con
  `role=ADMIN`). Válido porque hoy el único camino para ser ADMIN es
  haber creado el grupo (`GroupsService.create`) — no existía todavía
  forma de promover a nadie antes de este sprint. Verificado que las 14
  filas de `groups` en la base de datos local tenían exactamente un admin
  cada una antes de aplicar la migración.
- **Expulsar un admin no es una operación directa**: ni un admin ni el
  propio propietario pueden expulsar (`kickMember`) a otro admin o al
  propietario en un solo paso — hay que quitarle antes el rol de admin
  (`updateMemberRole`, exclusivo del propietario) y expulsarlo después
  como miembro normal. Motivo: `product-rules.md` da al creador
  "nombrar/quitar administradores" como potestad explícita, pero no dice
  en ningún sitio que el creador pueda expulsar directamente a un admin —
  separar ambos pasos evita inventarse un permiso no pedido.

## 2026-09-10 — Sprint 2 (corrección de la regla de Seguimiento en GitHub)

- **Sustituye la decisión de Sprint 0/1** sobre cuándo mover un issue a
  Status "Test" en el Project. Antes: al hacer merge de `dev` a `main`.
  Ahora: al subir algo implementado a `dev`. Motivo dado por el usuario:
  se había entendido que la regla debía aplicarse siempre que se
  implementa algo, no solo al mergear a main — y en la práctica `dev` (
  `dev.acerton.app`) es el entorno donde él prueba, así que es ahí donde
  algo pasa a estar "listo para probar", no en el merge a producción.
  Efecto inmediato: el issue #7 (Sprint 2), completo en `dev` desde hace
  varios commits pero todavía en "New features" porque no se había
  mergeado a `main`, se movió a "Test" retroactivamente. Ver
  `.claude/skills/quiniela/SKILL.md` § Seguimiento en GitHub para el
  texto actualizado de la regla.

## 2026-09-10 — Sprint 0

- **Skill de proyecto, no global.** `/quiniela` vive en
  `.claude/skills/quiniela/` (este repositorio), no en la carpeta global
  de skills del usuario. Motivo: el roadmap y los documentos solo tienen
  sentido dentro de este repo; ya existían skills de proyecto instaladas
  aquí (`neon-*`), confirmando que el formato es compatible con esta
  instalación de Claude Code.
- **Sin hook de cierre de sesión.** No se ha configurado ningún hook (p.
  ej. de tipo `Stop`) para recordar `/quiniela cerrar`. Motivo: el encargo
  pide explícitamente no prometer detección automática de cierre, y añadir
  un hook es una pieza más de infraestructura frágil (puede no dispararse
  en un cierre forzado) para un beneficio menor frente a la estrategia
  principal ya prevista (guardar durante `/quiniela continuar` + cierre
  explícito). Queda en `backlog.md` como posible ampliación futura si el
  usuario lo pide explícitamente.
- **CLAUDE.md creado desde cero.** No existía ningún `CLAUDE.md` en el
  repositorio antes de esta sesión, así que no había contenido previo que
  conservar; se ha creado con una referencia breve a `docs/quiniela/`.
- **`product-rules.md` transcribe el encargo del usuario casi literalmente**,
  reorganizado por secciones, en vez de resumirlo o interpretarlo. Motivo:
  es la referencia normativa de comportamiento — cualquier pérdida de
  matiz en una paráfrasis podría cambiar una regla de producto sin que
  nadie lo decidiera explícitamente.

## 2026-09-10 — Sprint 1 (interfaz de juego)

- **Presupuesto de estilos por componente ampliado** (`angular.json`,
  `anyComponentStyle`: `3kB/6kB` → `4kB/10kB`). Motivo: `current-matchday`
  ya iba casi al límite (6.01kB de 6kB de error) antes de tocar nada de
  este sprint; el borde animado de guardado necesitaba más CSS del que
  cabía. Antes de subir el límite se comprobó que la mitad de los
  componentes del repo ya superaban el umbral de warning de 3kB, así que
  ese umbral ya no era una señal accionable — subirlo da margen real sin
  dejar de avisar si algún componente crece de forma desproporcionada.
  Alternativa descartada: recortar CSS existente de `current-matchday`
  para hacer hueco — se descartó por tocar más código del necesario para
  una tarea de UI puntual.
- **`.selected` deja de rellenar de verde por sí solo.** Antes, elegir una
  opción la pintaba de verde al instante (optimista, sin esperar
  confirmación). Ahora `.selected` solo marca el borde; el relleno verde
  (`.confirmed`) requiere `saved === true`. Es un cambio de comportamiento
  real, no solo estético — se sigue directamente de la regla "mostrar
  verde cuando la última selección esté confirmada" del encargo, que
  distingue explícitamente "elegida" de "confirmada por el servidor".
- **Sin botón de "reintentar" dedicado.** Se decidió que reintentar tras
  un fallo es simplemente volver a pulsar la opción (ya dispara `save()`
  de nuevo) en vez de añadir un botón o icono adicional — la regla pide
  "conservar la selección... y permitir reintentar", no un control nuevo
  visible, y el patrón de la app (pulsar de nuevo) ya es coherente con
  cómo funciona seleccionar en primer lugar.
- **Animación del borde, iterada cuatro veces tras sucesivo feedback del
  usuario.** v1: pulsaba el borde en bucle (parpadeo). v2: crecimiento
  radial vía `box-shadow` inset de 0 a 2px. v3: trazo direccional con
  `<rect>` SVG (`pathLength="100"`, `stroke-dashoffset` de 100 a 0) que
  dibuja el contorno empezando arriba a la izquierda y avanzando hacia la
  derecha (orden natural del path de un rect: arriba→derecha→abajo→
  izquierda) — pero todavía con duración fija (0.6s) y con un borde verde
  estático de fondo (`.selected`) visible a la vez que el trazo. v4
  (versión final): el usuario señaló que ese borde estático no debía
  aparecer nunca (solo el SVG debe mostrar verde), y que la duración del
  trazo debía ser la que tarde la petición real, no un tiempo fijo — "si
  la petición tarda 0.5s eso es lo que debe tardar en dar todo el
  recorrido". Se quitó `.selected { border-color: accent }` por completo.
  Se sustituyó la animación CSS por un `drawOffset` numérico en
  `MatchPredictionState`, escrito fotograma a fotograma con
  `requestAnimationFrame`: mientras se espera la respuesta, avanza hacia
  un límite asintótico (se acerca sin llegar del todo, porque no se sabe
  cuánto va a tardar); en cuanto la respuesta llega de verdad, un segundo
  tramo remata rápido (180ms) el trozo que faltaba hasta 0, y solo
  entonces se aplica `saved`/`error` — el relleno verde (o el borde de
  error) nunca puede adelantarse a que el contorno se haya cerrado del
  todo. El relleno de fondo sigue siendo una `transition` aparte de
  `background-color` (0.35s) en `.confirmed`. Se limpian los
  `requestAnimationFrame` pendientes al destruir el componente para no
  dejarlos corriendo indefinidamente si se navega fuera a media
  animación. Se descartó `conic-gradient` + `mask` (variante CSS del
  mismo efecto direccional) por depender de `@property`, con peor soporte
  garantizado en WebKit/iOS. Verificado leyendo `stroke-dashoffset` y
  `border-color`/`background-color` reales fotograma a fotograma con
  peticiones de red retardadas artificialmente a distintos tiempos (100ms
  y 500ms), no solo mirando capturas (a este tamaño de botón, ~30px, una
  captura no basta para distinguir "75% dibujado" de "100%" a simple
  vista, ni para ver si hay un borde estático de fondo).
- **El mismo efecto se extendió a resultado exacto** (ampliación pedida
  directamente por el usuario, no estaba en el encargo original de
  sprints): los dos inputs (L/V) y el separador pasan de ser tres
  elementos sueltos a una sola caja (`.exact-score-box`) con un único
  borde, que recibe el mismo `drawOffset`/SVG que los botones 1X2. A
  diferencia de estos, **no** se rellena de fondo al confirmar (el
  usuario pidió explícitamente que no, para no tapar los números ya
  escritos) — solo cambia el color del borde. Esto sustituye al
  spinner/tick que este modo conservaba desde la primera versión del
  sprint (que solo pedía quitarlo "en 1X2"): con el nuevo efecto de borde
  cubriendo ambos estados (guardando/confirmado) en los dos modos, mantener
  el spinner/tick aparte ya no aportaba nada y se quitó por consistencia.
- **Las etiquetas L/V pasan de repetirse en cada fila a mostrarse una sola
  vez como cabecera de columna** (feedback directo: "ya se entiende que es
  L y V para toda la columna"). La cabecera (`.exact-score-columns`)
  reproduce el ancho/padding/huecos exactos de `.exact-score-box` para que
  quede alineada con las casillas sin tener que calcular la posición a
  mano ni duplicar constantes de layout en dos sitios.
- **La protección contra respuestas antiguas (`requestSeq`) se aplicó en
  `save()`**, que es compartido por 1X2 y resultado exacto — aunque la
  regla de "eliminar spinner y tick" y "animar el borde" solo mencionan
  1X2 explícitamente, "evitar que respuestas antiguas sobrescriban
  selecciones nuevas" no tenía esa restricción, y tocaba el mismo punto
  del código para ambos modos. Se aplicó a los dos sin necesidad de
  duplicar lógica.

- **Bug de fuga de estado entre grupos, corregido dentro del propio Sprint
  1** (no estaba en la lista de tareas original): `predictionState`
  (`current-matchday.component.ts`) es un `Map` en memoria del componente,
  no se limpiaba al cambiar de grupo activo. Como los partidos son
  globales (compartidos entre grupos que activan la misma competición) y
  las predicciones son por grupo, el check de "guardado" de un grupo podía
  quedar visible al cambiar a otro grupo donde ese mismo partido no se
  había pronosticado todavía. Se decidió corregirlo en esta misma sesión
  (una línea, `this.predictionState.clear()` en `load()`) en vez de
  aplazarlo a `backlog.md`, porque tocaba exactamente el estado que ya se
  estaba modificando para el borde animado y el riesgo de tocarlo era
  mínimo. Verificado con test de navegador antes/después del fix.

## 2026-09-10 — Entorno dev/pre e infraestructura

- **Producción pasa a Render "Starter" (7 $/mes, ~6,50-6,80 €), dev se
  queda en el plan free (se duerme).** Precio confirmado por búsqueda
  directa (no supuesto): Starter = 512 MB RAM, 0.5 CPU, siempre activo, sin
  el "dormido" que tiene hoy producción. Dentro del tope de 10 €/mes que
  puso el usuario. **Aprobado por el usuario** (respuesta a la pregunta de
  coste), pero **sin ejecutar todavía**: cambiar el plan de un servicio en
  Render se hace desde su panel (o con su API/token), y esta sesión no
  tiene acceso — queda listo para hacerlo en cuanto el usuario lo haga él
  mismo o comparta acceso.
- **Datos del entorno dev**: el usuario confirmó datos de prueba (no copia
  de datos reales de producción). Al ejecutar el plan de `roadmap.md` §
  Infraestructura, la rama `dev` de Neon se crea solo-esquema (o se copia y
  se purgan los datos de usuario) y se rellena con el `prisma:seed`
  existente más usuarios/grupos de prueba, no con un dump de producción.
- **Acceso a dev.acerton.app**: el usuario y su compañero únicamente.
  Cloudflare Access se configura con solo esos dos emails.
- **Rama `dev` de Neon creada y limpiada de datos reales.** El usuario
  confirmó explícitamente el borrado (el sistema lo bloqueó primero por
  ser una acción destructiva vía `run_sql`, correctamente — se pidió
  confirmación en vez de forzarlo). Ejecutado solo contra
  `br-misty-pond-za5lnxwp` (dev), nunca contra `br-small-lake-zatnhupb`
  (production); se verificaron ambas ramas antes y después (dev pasó de
  16 usuarios/9 grupos/374 predicciones a 0/0/0 con el catálogo intacto;
  production se comprobó con 16 usuarios después del borrado, sin
  cambios). No se pudo marcar la rama como "protected" en Neon — el plan
  free solo permite una rama protegida y `production` ya la usa; se dejó
  sin fecha de expiración como alternativa (`expires_at: null`), que es
  lo que evita que desaparezca sola, aunque no evita un borrado manual
  accidental.

## 2026-09-10 — Seguimiento del roadmap en GitHub

- **El roadmap se refleja también como issues + Project de GitHub**, a
  petición explícita del usuario, no solo en `docs/quiniela/`. Un issue
  por sprint (2 al 10, más uno de infraestructura) con las tareas de su
  tabla como checklist, label `enhancement`, en el Project **"Quiniela"**
  (número 4, `MarcSagues`), columna "New features". Las 6 tareas del
  Sprint 1 ya tenían issue propio (creados antes de esta decisión) en
  columna "Test", porque ya estaban implementadas y solo faltaba
  verificarlas — no se tocaron.
- **Regla permanente aceptada y guardada en `SKILL.md`**: cada merge a
  `main` mueve a Status "Test" las funcionalidades/bugs que entren en ese
  merge. Documentado con los IDs exactos (project, campo Status, cada
  opción) para no tener que redescubrirlos cada sesión. El propio merge
  sigue necesitando autorización explícita, como cualquier otro; lo único
  que pasa a ser automático es la actualización del Project una vez el
  merge ya está autorizado y hecho.
- El token de `gh` no tenía el scope `project` al principio de esta
  sesión — el usuario lo concedió con `gh auth refresh -s project`
  (acción suya, requiere navegador). Si una sesión futura no lo tiene,
  hay que pedírselo de la misma forma, nunca intentar sortearlo.

## 2026-09-10 — Sprint 2 (grupos y navegación)

- **`postLoginRoute()` centralizado en `GroupsService`**, usado en los 4
  sitios donde termina un login (email, registro, Google nativo, Google
  web) en vez de duplicar la lógica de "cuántos grupos tengo" en cada
  componente.
- **`returnUrl` vía query param para login normal, vía `sessionStorage`
  para Google web.** El login de Google en web sale completamente de la
  app (redirección a Google y vuelta a través del backend) — un query
  param no sobrevive ese viaje porque el backend no lo conoce. Se decidió
  `sessionStorage` (mismo origen antes y después) en vez de tocar el
  backend para que reenvíe un parámetro `state` de OAuth, por ser un
  cambio mucho más pequeño y sin tocar el flujo de Passport.
- **Bug encontrado y corregido en el camino**: `auth-page`
  (`setMode()`) renavegaba a `/login`/`/register` sin `queryParamsHandling:
  'preserve'`, así que cualquier `returnUrl` puesto por el guard se
  borraba nada más cargar la página (se ejecuta desde `ngOnInit`). Sin
  este fix, la función de enlaces directos no habría funcionado nunca.
- **`myPosition` en `/groups/mine` reutiliza el mismo criterio de scope
  que la pantalla de Tabla** (competición única vs. combinada si hay
  varias activas) en vez de inventar uno nuevo — implementado como un
  `findFirst` adicional por grupo (N+1 aceptado: la lista de grupos de un
  usuario es pequeña). Efecto colateral positivo detectado y corregido de
  paso: los chips de competiciones de la tarjeta de grupo nunca se
  mostraban porque la consulta original no incluía esa relación.
- **Alcance de "respetar enlaces directos" limitado a `authGuard` y
  `usernameGuard`.** `hasGroupGuard` (0 grupos) se dejó fuera a propósito
  — encadenar un `returnUrl` a través de "crea o únete a un grupo primero"
  es un caso mucho más raro (un enlace a algo de un grupo concreto no
  tiene sentido para alguien que no pertenece a ninguno) y habría añadido
  complejidad desproporcionada para el beneficio.
- **"Rueda de ajustes" se deja como está** (icono de "sliders", no una
  rueda literal) — decisión explícita al cerrar el sprint, no un olvido:
  cumple el mismo propósito y cambiarlo sería puramente estético.
- **Sprint 2 no se mergea a `main` en la misma sesión que se implementa**,
  a diferencia del Sprint 1 — el usuario pidió explícitamente probarlo
  primero. Documentado para que quede claro que "implementado y
  verificado en web" no significa "ya en producción" en este caso.

## Hallazgos técnicos que condicionan sprints futuros (no son decisiones de producto, pero hay que decidir antes de implementar)

Estos son hechos comprobados en el código, no interpretaciones. Las
preguntas que abren están en `backlog.md`.

- **Roles**: `GroupRole` (Prisma) solo distingue `ADMIN`/`MEMBER`. No hay
  ningún campo de "propietario/creador" en `Group` ni en
  `GroupMembership`. La regla de "el creador tiene control total y los
  admins no pueden tocar a otros admins" necesita un tercer nivel que hoy
  no existe.
- **Borrado de grupo**: `Group` tiene `onDelete: Cascade` hacia
  `GroupMembership`, `GroupCompetition`, `Prediction`, `RankingSnapshot`,
  `Streak` y `UserBadge`. Hoy, borrar un grupo borra físicamente todo su
  historial — justo lo contrario de "conservar historia y trofeos
  concedidos". No hay endpoint de borrado de grupo todavía (no se ha
  probado el cascade en producción, solo se ha leído el schema).
- **Sin endpoints de gestión de membresía**: `groups.controller.ts` no
  tiene rutas de salir, expulsar, transferir propiedad ni eliminar grupo.
  Se construyen desde cero en el Sprint 3.
- **Insignias por grupo, no globales**: `UserBadge` es único por
  `(userId, badgeId, groupId)` y `BadgesService.award()` siempre recibe un
  `groupId`. Pasar a "globales por cuenta" implica decidir qué pasa con
  usuarios que ya ganaron la misma insignia en varios grupos (deduplicar,
  elegir la fecha más antigua como `earnedAt` canónico, o la que sea).
- **"Jornada perfecta" (`MATCHDAY_TOP_1`)**: la condición actual premia a
  **todos** los empatados en la posición 1 semanal (consulta
  `position: 1` sin excluir empates). El catálogo nuevo propuesto define
  "En lo más alto" como "primero **en solitario**" — es una condición más
  estricta, no solo un cambio de nombre.
- **Sin modelo de temporada**: `Competition.currentSeason` es un único
  `Int` mutable por competición; no hay tabla de temporadas, ni relación
  grupo↔temporada, ni forma de consultar "temporadas anteriores" de un
  grupo. Toda la sección de temporadas/participación/trofeos depende de
  diseñar esto primero.
- **Racha solo por grupo**: `Streak` es único por `(userId, groupId)`. No
  existe ninguna agregación "global" que combine jornadas de todas las
  competiciones de todos los grupos de un usuario, ni deduplicación de una
  misma jornada repetida en varios grupos.
- **Notificaciones solo a nivel de dispositivo**: `NotificationToken`
  guarda tokens de push, no preferencias. No hay modelo de "qué tipos de
  aviso quiere recibir este usuario" ni de "grupos silenciados".
- **Avatares**: `User.avatarUrl` es un string libre (probablemente pensado
  para una URL de Google). No hay catálogo de avatares por defecto ni
  endpoint de subida/recorte de imagen.
- **Nombre bloqueado 7 días**: esto SÍ está ya implementado en servidor
  (`User.nameChangedAt`, lógica en `UsersService.updateName` referenciada
  desde el frontend) — es de los pocos puntos del encargo que ya cumple
  la regla de fondo, solo falta el detalle de UI (mostrar el nombre dentro
  del input bloqueado en vez de ocultarlo).

## 2026-09-16 — Requisitos de producto para el sistema de referidos (Sprint 14)

A petición explícita del usuario, planteamiento (sin implementar todavía
— el sistema de referidos sigue ⬜ en `roadmap.md` Sprint 14) de cómo debe
funcionar cuando se construya:

- **Un único código por usuario, no dos sistemas paralelos**: el mismo
  código sirve para compartir como link (parámetro tipo `?ref=CODIGO`) y
  para teclear a mano — no un código de invitación y otro distinto para
  link.
- **Dos formas de entrada, un solo resultado**: el destinatario puede
  vincularse al referidor tanto abriendo el link como introduciendo el
  código manualmente; ambos caminos deben producir la misma relación
  referido↔referidor.
- **El campo para teclear el código va siempre en un sitio de baja
  visibilidad** (Ajustes, no un flujo destacado ni la pantalla de
  bienvenida) — decisión explícita de diseño, no un olvido.
- **Pensado para enganchar con Premium (Sprint 11) más adelante**: la
  idea es poder aplicar descuentos de Premium según de qué usuario
  concreto venga el referido. Esto no es una tarea de Sprint 14, pero
  condiciona el modelo de datos: la relación referido↔referidor debe
  quedar guardada de una forma que Sprint 11 pueda consultarla sin
  rediseñar el sistema de referidos desde cero.

Sin decidir todavía (no bloquea nada mientras el sprint no llegue a esta
tarea, ver `backlog.md` si hiciera falta registrar una pregunta abierta
más adelante): formato exacto del código, límites de uso por cuenta, y el
mecanismo de descuento en sí, que es alcance de Sprint 11 cuando toque.

## 2026-09-16 — Resuelta la duda de Sprint 9 sobre precisión de recordatorios en Render free

Pregunta que quedó abierta en `backlog.md` desde el Sprint 9 ("confirmar
si el plan gratuito de Render, que se duerme sin tráfico, afecta a la
precisión de los recordatorios de cierre — 24h/5h/1h/30min — antes de
prometer puntualidad"). El usuario reportó el síntoma real: "las
notificaciones siguen sin llegar cuando faltan X horas... solo las
recibí un día y 6 de golpe".

**Causa confirmada leyendo el código**: `JobsService.sendClosingReminders`
corre cada 5 minutos (`@Cron(CronExpression.EVERY_5_MINUTES)`), pero a
diferencia de `closeDueMatchdays`/`syncResultsAndFinalize` no se relanza
en `onApplicationBootstrap` — mientras Render duerme, este cron
simplemente no corre. Además, `shouldSendMatchReminder`
(`matchday.util.ts`) exige que el partido siga siendo futuro
(`msUntilKickoff >= 0`): si la ventana de un aviso pasa con el servidor
dormido, ese aviso se pierde para siempre, no se manda "tarde" después.
Cuando el servidor por fin despierta y el cron consigue correr, coge de
golpe todos los avisos que en ese instante caen dentro de su ventana —
de ahí los "6 de golpe" de un solo tirón y nada el resto del tiempo.

**Resuelto, sin cambios de código**: el usuario confirmó que producción
ya está en el plan **Render Starter** (siempre activo, ~7$/mes) desde
antes de esta sesión — el documento de infraestructura seguía marcándolo
"pendiente" por un despiste de registro (corregido en `roadmap.md`). En
Starter este problema no puede ocurrir (el proceso nunca duerme). El
comportamiento irregular que vio el usuario es del entorno de **dev**
(`api-dev.piqo.es`, plan free a propósito, sin coste) — confirmado con
él que ahí no hace falta arreglar nada, ya que es solo para pruebas.
Si en el futuro hiciera falta mantener dev despierto sin pasar a un plan
de pago, la opción barata es un ping externo periódico (GitHub Actions
programado, o un servicio gratuito tipo cron-job.org) — no implementado,
descartado por el usuario por innecesario ahora mismo.
