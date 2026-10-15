# Estado actual

## 2026-10-15 — Quiz mixto: 20 preguntas de todas las ligas (fuera de sprint)

Petición del usuario: en vez de un quiz por liga y jornada (10 preguntas), **un único quiz de 20 preguntas** con los partidos
más interesantes de todas las ligas mezcladas, sin reparto equitativo. Decisiones del usuario: **un quiz para el fin de semana
(viernes a lunes) y otro entre semana (martes a jueves)**, hora de Madrid, cada uno se cierra al empezar el primero de *sus*
partidos; y **más preguntas a los partidos grandes**. Reglas (`backend/src/quiz/quiz.rules.ts`, `planMixedQuiz`): el mejor partido
de cada liga entra siempre (1 pregunta); luego cada partido pide 4 preguntas si se enfrentan dos grandes, 2 si juega un grande
(o dos clubes de nivel, lista `NOTABLE`) y 1 si no, en orden de interés (Barça/Madrid/Liverpool primero, extra si se cruzan dos
grandes, +1 Champions); si sobran preguntas, se reparten más a los elegidos (hasta 8 tipos por partido). Preguntas ordenadas
por hora de inicio, las de un mismo partido juntas. Se publica la ventana actual y la siguiente dos días antes de que empiece
(`publishableWindows`), con los partidos aún sin empezar ya importados; una vez publicado no cambia.
**Esquema** (migración `20261015120000_mixed_quiz`): `quiz_events.matchdayId` pasa a opcional y se añaden `windowKey` (único),
`windowKind`, `windowStart`, `windowEnd` y `number` (nº de quiz mixto de la temporada, sale como `matchdayOrder`). Los quizzes
antiguos se conservan y siguen funcionando hasta cerrar; ya no se publican nuevos por liga. **API**: `overview` devuelve `events`
(abiertos del que cierra antes + último mixto cerrado) y, para las apps anteriores, `quizzes` con el mixto repetido en cada liga
(con `competition` real) para que sus pestañas sigan funcionando. Cada resumen lleva `kind` (`MIXED`/`MATCHDAY`), `window` y
`competitions`; cada pregunta, su `competition`. La clasificación por liga suma solo las preguntas de partidos de esa liga
(sirve para antiguos y mixtos); la general, igual que antes. Avisos: «Quiz del fin de semana» / «Quiz de entre semana».
**Frontend**: el centro del Quiz ya no tiene pestañas de liga para jugar (sí para filtrar la clasificación): tarjeta «Quiz del
finde» / «Quiz entre semana» con los días y las ligas que entran, otros abiertos aparte y el último jugado; en cada pregunta sale
su liga; el historial filtra por cualquier liga de las preguntas. Textos de intro, nota de la general y aviso actualizados en los
6 idiomas. La 1.1.0 ya estaba aprobada en la App Store (TestFlight rechazó subir otra 1.1.0): versión **1.1.1** con su línea en el historial.
**Verificado**: backend 542 tests (rules, rendimiento, historial, avisos) y los 7 de integración contra MySQL local; frontend
tests (ver PR). **Necesita**: backend en main (Render aplica la migración) y portado a `dev` (migración a mano en Neon), build nueva.
**Pendiente / NO verificado**: la ficha `docs/app-store/ficha-1.1.0.md` sigue con el texto anterior del Quiz.

## 2026-10-13 — Barra superior con más margen inferior sin selector de grupo (fuera de sprint)

Petición del usuario. En las pantallas sin selector de grupo debajo (todas salvo Jornada y Tabla) la barra superior deja 14px
más de margen inferior, para que el contenido no quede pegado. `TopBarFacade.hasGroupSwitcher` mira la ruta (`/matchday`,
`/rankings` y subrutas) y el host de `app-top-bar` lleva la clase `no-group-switcher`. En Jornada y Tabla no cambia (52px).
**Verificado** en navegador (local: 66px en Grupos y Perfil, 52px en Tabla) y 222 tests del frontend (4 nuevos).
Además la barra y el selector de grupo fijos pasan de translúcidos (94% + desenfoque, dejaban ver el fondo punteado) a opacos
(`var(--p4-bg)`), con un degradado de 14-16px justo debajo (`::after`) para que el contenido que pasa por debajo se desvanezca
en vez de cortarse de golpe.
La barra pasa de `sticky` a `fixed` (clase `.bar-fixed`, anclada a la pantalla a 480px de ancho máximo y centrada): al hacer scroll
o al tirar hacia abajo en iOS solo se mueve la vista, nunca la barra. El host de `app-top-bar` solo reserva su hueco en el flujo
(`--p4-topbar-h` + `--topbar-extra`), así que el contenido empieza justo debajo y el selector de grupo sigue pegado con `sticky`.
**Necesita** build nueva; sin línea en el historial (ajuste visual menor).

## 2026-10-13 — Clasificación del Quiz: mi puesto fijo, scroll infinito y salto a mi fila (fuera de sprint)

Petición del usuario. **Mi puesto**: siempre hay una fila fija arriba de la tabla con mi posición y mis puntos (aunque esté en el 200), y al pulsarla
baja con scroll suave a mi fila en la lista (que se resalta un momento). Si mi fila aún no está cargada, se pide una ventana de 10 jugadores por
encima y por debajo de mí (los que tengo cerca) y se salta a ella; entre lo cargado al principio y esa ventana queda un hueco
(«N jugadores más · ver anteriores») que se cierra con el botón del hueco o con el scroll infinito. **Scroll infinito**: un centinela
(`InViewDirective`) al final de cada tramo carga la página siguiente al verse; sustituye al botón «Ver más». El scroll infinito se pausa durante el
salto suave para que las filas no se muevan. Para esto el backend manda `rowNumber` (orden total, no se repite con los empates) en cada fila y en
`me`, y el cliente pide tramos con `cursor`+`limit`; la lógica de tramos está en `features/quiz/domain/ranking-segments.ts`. Tocar la fila de un
jugador sigue abriendo su perfil. **Verificado**: backend 53 tests de Quiz (2 nuevos) y lint, frontend 261 tests (22 nuevos), y en navegador con 250
jugadores (puesto 250: 20 filas al abrir, el scroll infinito carga de 20 en 20, y al pulsar mi puesto se carga la ventana 240-250 y se baja con
scroll suave). **NO** visto en iPhone. **Necesita** backend desplegado y portado a `dev`, y build nueva.

## 2026-10-13 — El Quiz carga mucho más rápido (fuera de sprint)

Petición del usuario («el quiz carga muy lento al abrir la vista»). **Medido** en local al abrir `/quiz`: **1 346 consultas** a la base de
datos y dos `GET /quiz/overview` a la vez (223 y 516 ms). Causas: `overview` publicaba rondas de todas las ligas en cada apertura, y por cada
liga hacía varias consultas, un refresco (transacción con bloqueo) y luego `detail()` con otro refresco por quiz; además la pantalla y la barra
inferior pedían el resumen a la vez. **Hecho (backend)**: `overview` se resuelve en lote (lista ligera de quizzes de la temporada, los elegidos y
mis participaciones: 2-3 consultas en lugar de cientos); `competitions()` se guarda 60 s; `publishAvailable` desde las lecturas como mucho cada 30 s
(`publishAvailableIfStale`) y `refreshEventIfStale` (20 s, comparten ejecución las llamadas a la vez) en `overview` y `rankings`; el cron de cada
minuto (`QuizJobs.refreshAll`) ya mantiene todo al día y las escrituras (responder, terminar) siguen con `refreshEvent` exacto. **Hecho (frontend)**:
`QuizService.getOverview()` comparte la petición en vuelo. **Resultado** (mismo escenario): 83 consultas en la primera apertura y ~133 en la
segunda (incluyen el arranque de la app y el cron), `overview` en ~100 ms y la clasificación en ~87 ms. **Coste**: una ronda nueva o un cierre
puede tardar hasta ~30 s en verse en la pantalla (antes, al instante); las cachés son por proceso del backend. **Verificado**: backend 51 tests de
Quiz (6 nuevos) y lint, frontend 239 tests (3 nuevos), y en navegador (la pantalla muestra lo mismo). **Necesita** backend desplegado y portado a `dev`.

## 2026-10-13 — El selector de grupo va dentro de la barra superior, fijo con ella (fuera de sprint)

Petición del usuario: el selector de grupo ya no sube con el contenido. `app-top-bar` lo lleva dentro, bajo la fila del logo (12px de aire), y
solo en Jornada (`/matchday`) y Tabla (`/rankings`) exactas: sus subpantallas (resultados, calendario, historial) no lo llevan, como antes.
Se quitan los `app-group-switcher` y las cabeceras fijas `.head-row` de `current-matchday` y `rankings-page`. El hueco que reserva la barra en
el flujo es 52px + 76px con selector (`--topbar-extra`) o + 14px sin él. **Verificado** en navegador (local: la barra mide 128px, el selector
queda a 64-118px y no se mueve al hacer scroll; en Grupos, Quiz y Perfil no sale) y 236 tests del frontend. **NO** visto en iPhone.
**Necesita** build nueva.

## 2026-10-13 — Perfil general de un jugador (desde el Quiz, Tabla...) (fuera de sprint)

Petición del usuario: al pulsar a un jugador debe abrirse siempre su **perfil general**, no una vista suelta del Quiz. Nueva
pantalla `/player/:userId` (`PlayerProfileComponent`), a la que llevan cada fila de la clasificación del Quiz (y la tuya fijada) y
cada fila de Tabla: avatar con nivel, nombre, bandera del equipo favorito; **Grupos** (aciertos, fallos, % de acierto y racha
global en todos sus grupos, los **marcadores exactos que ha clavado** (cuántos, de cuántos pronósticos de marcador, su % de acierto, y los 5 últimos partidos),
cómo va su racha, en cuántos juega, y los grupos en común con aciertos y racha de cada uno, que enlazan al detalle de
miembro de ese grupo); **Quiz** (posición de la temporada, puntos, jugados, aciertos y fallos, y el botón al Historial de Quiz
con filtro por liga); **Insignias** (las distintas que ha ganado; se pueden pulsar y abren el mismo detalle que en tu perfil, con el % de jugadores que la tienen) y **Trofeos** (la vitrina; todos bloqueados porque Piqo aún no
tiene datos reales de trofeos). Backend: `GET players/:userId` (`PlayersModule`/`PlayersService`), una sola respuesta; los grupos
solo son los que compartes con el jugador (los suyos todos, si es el tuyo). `QuizService.history` ya no pide compartir grupo y
devuelve avatar, nivel y equipo favorito. Tabla ya no abre directamente los pronósticos de la última jornada (`openProfile`
sustituye a `viewUserPicks` en la plantilla; el método sigue en el facade). **Verificado**: backend 51 tests de Quiz y Players y
lint, frontend 233 tests, y en navegador (local: desde el Quiz y desde Tabla se abre el perfil con grupos, Quiz, insignia y
trofeos, también el de otro jugador). **Necesita** backend desplegado en main y portado a `dev`, y build nueva. Línea en la 1.1.0.

## 2026-10-13 — Tabla: la gráfica también sale en «General» (fuera de sprint)

Petición del usuario: en «General» (Total) no había gráfica porque cada liga tiene su calendario de jornadas. Ahora se juntan
las jornadas finalizadas de todas las ligas activas del grupo **por fecha**: cada punto es una jornada de una liga, con el
número encima y la liga debajo (J1 Liga, J1 UCL, J2 Liga...), puntos acumulados; al tocar un punto sale el nombre completo de
la liga. Backend: el historial de cada liga (`GET groups/:id/rankings/history`) manda ahora `closesAt` de cada jornada (para
ordenar entre ligas). Frontend: `mergeCompetitionHistories` (una petición por liga, una vez por grupo y en paralelo),
`EvolutionChart.sublabels/fullLabels` y una segunda línea en el eje; las barras de «Tú» llevan la liga debajo. Si un backend
no manda `closesAt` no hay gráfica en General (no se mezcla mal). **Verificado**: backend 18 tests de Rankings y lint, frontend
224 tests (6 nuevos) y en navegador (local, grupo con La Liga y Bundesliga: J2 Liga, J3 Liga, J2 Bund, J4 Liga...). **Necesita**
backend desplegado en main (producción) y portado a `dev`; línea en la 1.1.0 del historial.

## 2026-10-13 — Tabla: se entra en la primera liga y Total no cambia tras pasar por Semanal (fuera de sprint)

Fallo reportado por el usuario en la 1.1.0: en un grupo con varias ligas, de Grupos a Tabla no salía la gráfica y el rey del
marcador exacto enseñaba unos datos; al pasar a Semanal y volver a Total salía la gráfica y el rey era otro. Causa: se entraba
en «General» (sin gráfica; el rey suma todas las ligas) y Semanal salta a la primera liga y Total ya no volvía. **Hecho**
(`RankingsPageFacade`): con varias ligas se entra en la primera (con su gráfica y su selector de jornada); «General» sigue en
las pestañas. Si el usuario estaba en General, Semanal le lleva a una liga y Total le devuelve a General; si en Semanal elige
otra liga, Total se queda en ella. **Verificado** en navegador (local, grupo de dos ligas: entrada, Semanal y Total dan la misma
liga, gráfica y rey) y 218 tests del frontend (1 nuevo).

## 2026-10-13 — Historial de Quiz (fuera de sprint)

Petición del usuario. En Estadísticas (la propia, `/profile/stats`, y la de un miembro, `.../members/:userId/stats`) y en
el detalle de miembro hay un botón «Historial de Quiz» que lleva a `/quiz/history/:userId`: cada quiz ya cerrado en el que
respondió algo, con sus respuestas, la correcta, acierto o fallo (pendiente/anulada si aún no se resolvió), los puntos y
totales; se puede filtrar por liga. Backend: `GET quiz/history/:userId` (`QuizService.history`): solo quizzes con
`lockedAt` (nunca uno abierto, para no filtrar respuestas), el propio o el de quien comparte grupo (403 si no), máximo los
50 más recientes, y las preguntas con la misma forma que el detalle del quiz (`questionView`, extraído de `readDetail`).
Sin migración. Línea en la 1.1.0 del historial. **Verificado**: backend 45 tests de Quiz (5 nuevos), frontend 217 (6
nuevos) y `tsc`; en navegador (local) con el historial propio, el filtro por liga y el de otro jugador (vacío).
**NO** verificado: el historial de otro jugador con quizzes. Los totales son de los 50 más recientes.

## 2026-10-13 — Barra superior y selector de grupo fijos (fuera de sprint)

Petición del usuario: la barra de arriba (Piqo, avisos, perfil) se queda siempre visible al hacer scroll, y en las
vistas con selector de grupo (Jornada y Tabla) el selector se queda pegado justo debajo. `app-top-bar` pasa a
`position: sticky` (el margen de seguridad de iOS va ahora dentro de la barra, no en el shell) y `.head-row` de
Jornada y Tabla usa `top: var(--p4-topbar-h)` (variable en `styles.scss`: 52px + margen de seguridad). Solo CSS.
**Verificado** en navegador (local) en Jornada y Tabla y 211 tests del frontend; **NO** en iPhone (margen de
seguridad y notch).

## 2026-10-13 — Retoques de la 1.1.0 y ficha de la App Store (fuera de sprint)

Equipo favorito: quitarlo es ahora un botón con una X (icono `cerrar`) junto a la bandera, en vez de un texto.
Historial de la 1.1.0: la línea de los idiomas decía «Perfil > Apariencia» y ahora «Perfil > Ajustes > Idioma», y la
del equipo favorito «Perfil > Ajustes» (en los 6 idiomas; la entrada 1.0.2, ya publicada, no se toca).
`docs/app-store/ficha-1.1.0.md` sustituye a la de la 1.0.3: nombres, subtítulos y palabras clave igual (son de la
app, no de la versión); texto promocional y descripción actualizados (tres formas de jugar con el Quiz, equipo
favorito) y Novedades copiadas del historial de la 1.1.0 en los 7 idiomas, todo dentro de los límites de Apple.

## 2026-10-13 — Versión 1.1.0 (fuera de sprint)

Decisión del usuario: con tantos cambios grandes (Quiz, equipo favorito, Ajustes con pestañas, registro con
Google/Apple, pantallas desde arriba, gráfica de Tabla) la siguiente versión es la **1.1.0**, no la 1.0.3. La 1.0.3
nunca salió (el último tag es `v1.0.2`), así que su entrada del historial pasó a ser la 1.1.0 (fecha 2026-10-13) y
`MARKETING_VERSION` del proyecto iOS también. Donde estas notas dicen «1.0.3», léase 1.1.0.

## 2026-10-13 — Tabla: tu posición justo encima de la tabla (fuera de sprint)

Petición del usuario: la tarjeta «Tú · posición · puntos» salía arriba de las gráficas y no se entendía. Ahora va
entre las gráficas (evolución y rey del marcador exacto) y la cabecera de la tabla, pegada a la lista de jugadores.
Solo cambia el orden en `rankings-page.component.html`. **Verificado** en navegador (local) y `tsc`.

## 2026-10-13 — Ajustes con pestañas dentro del Perfil (fuera de sprint)

Petición del usuario. **Hecho**: `/profile/settings` es una página con una pestaña por cada ruta hija: Nombre
(`profile-name`, extraído de la pantalla de Perfil), Equipo (favorito), Avisos, Apariencia (solo tema), Idioma
(`profile-language`, ya no va con la apariencia) y Contraseña (solo cuentas con contraseña). Perfil deja una sola
tarjeta «Ajustes» en lugar de las cuatro de antes y de la tarjeta del nombre. Cada pestaña es la pantalla de
siempre sin su cabecera propia; elegir equipo ya no vuelve a Perfil. Las rutas antiguas (`/profile/appearance`,
`/profile/change-password`, `/profile/favorite-team`, `/notifications/preferences`) redirigen a su pestaña.
El texto del historial sobre los avisos del Quiz ahora dice «Perfil > Ajustes > Avisos». Línea nueva en la 1.0.3.
**Verificado** en navegador (local, todas las pestañas y una redirección) y 211 tests del frontend.

## 2026-10-13 — Pantallas desde arriba y Quiz sin balón ni «Guardado» (fuera de sprint)

Peticiones del usuario. **Scroll**: el scroll de la app es el de `body` (html y body a `height:100%` con
`overflow-x:hidden`), no el de la ventana, así que `withInMemoryScrolling` del router no hacía nada y cada pantalla
heredaba el scroll de la anterior. `ScrollTopService` (arrancado en `AppComponent`) sube `body` en cada cambio de
ruta, también al volver atrás; cambiar solo query/fragmento no sube. **Quiz**: el disco de color ya no lleva balón
(con equipo sin colores en el catálogo sale su inicial) y fuera el «✓ Guardado» bajo la pregunta (siguen
«Guardando…» y los errores); borrada la clave `quiz.guardado`. Borde del disco/bandera/lista visible en tema
claro y oscuro. Línea en la 1.0.3 del historial. **Verificado** en navegador (local) y 205 tests del frontend.

## 2026-10-13 — Equipo favorito con bandera en el perfil (fuera de sprint)

Petición del usuario. **Hecho**: en Perfil > «Equipo favorito» (`/profile/favorite-team`, con buscador sin tildes) se
elige o se quita el equipo; al tocar uno se guarda y se vuelve a Perfil. Su bandera (franja fina y larga con los dos
colores del club, y debajo «Equipo favorito: X») sale en el perfil propio y en el detalle de miembro de un grupo, que es
lo que ven los demás. Backend: columna `User.favoriteTeam` (nombre completo, `VARCHAR(100)`), catálogo cerrado de 110
equipos con colores en `users/team-catalog.ts` (validado en el DTO, null para quitar), `GET users/me/team-catalog`,
`PATCH users/me/favorite-team`; `toPublicUser` y el perfil de miembro devuelven `favoriteTeam {name, primary,
secondary}`. Un equipo guardado que salga del catálogo se ve como «sin equipo». Migración `20261013180000_favorite_team`.
Línea en la 1.0.3 del historial.

**Verificado**: backend 508 tests y `tsc` (el lint solo da avisos de saltos de línea CRLF que ya existían), frontend 203
tests, `tsc` y build, `prisma validate`. **NO verificado**: la migración sobre una BD real, ni las pantallas en
navegador/iOS. **Necesita**: migración en prod ANTES de desplegar, build nueva y port a `dev` (Postgres).

## 2026-10-13 — Registro con Google y Apple (fuera de sprint)

Petición del usuario: la pantalla de «Crear cuenta» enseña ahora los botones de Google y Apple (este último solo en
iOS, como en el acceso) bajo el de crear cuenta, separados por una «o». Los botones viven en dos `ng-template` que
reutilizan acceso y registro. Línea en la 1.0.3 del historial. **Verificado**: `tsc`, build y tests; **NO** visto en
pantalla.

## 2026-10-13 — Quiz: disco con los colores del club (fuera de sprint)

Petición del usuario tras quitar los escudos: el icono de balón del Quiz sale ahora sobre un disco partido en
diagonal con los dos colores del club. Los colores salen de `clubColors` de football-data.org (endpoint
`/competitions/{id}/teams`; el de partidos no los trae), volcados una vez a un mapa estático por nombre completo
en `frontend/src/app/features/quiz/domain/team-colors.ts` (110 equipos de PL, Liga, Serie A, Bundesliga, Ligue 1
y Champions). Sin cambios de backend ni migración. Un equipo que no esté en el mapa (ascensos, otra temporada)
se queda con el disco neutro de antes. **Verificado**: 199 tests del frontend y `tsc`; no se ha visto en pantalla.
**Necesita**: build nueva. Sin línea en el historial (el Quiz es nuevo en la 1.0.3).

## 2026-10-13 — Quiz sin escudos de los clubes (fuera de sprint)

Decisión del usuario tras preguntar por derechos: los escudos (marcas y obras de los clubes, servidos por
football-data.org sin licencia de imagen) solo salían en la pantalla de preguntas del Quiz; ahora sale el
icono de balón que ya había para cuando faltaba el escudo. Fuera también el logo de competición de respaldo
en las pestañas del Quiz (todas tienen trofeo propio). Nombres de equipos y resultados se mantienen.
**Verificado**: 196 tests del frontend y `tsc`. **Necesita**: build nueva. Sin línea en el historial (el Quiz
es nuevo en la 1.0.3 y nadie ha visto los escudos).

## 2026-10-13 — Quiz: avisos opcionales y fuera el «provisional» (fuera de sprint)

Petición del usuario. **Hecho**: tres preferencias nuevas (`quizOpening`, `quizReminder24h`,
`quizReminder1h`, apagadas de serie) en «Preferencias de avisos», sección «Quiz de jornada».
`QuizRemindersService` (cron cada 5 min) avisa al abrirse cada quiz (si se abrió hace menos de 6 h) y 24 h y
1 h antes del cierre; los de cierre no le llegan a quien ya lo terminó, nunca salen dos franjas a la vez y
cada aviso se reclama con un `updateMany` condicionado antes de enviar. Tipos `QUIZ_OPENED` y
`QUIZ_CLOSING_SOON` (icono en el buzón; al pulsarlos, al Quiz). Textos del push en español, como el resto.
Migración `20261013150000_quiz_reminders` (los quizzes ya publicados se marcan como avisados). Quitado el
aviso «PROVISIONAL» de la clasificación del Quiz. Línea en la 1.0.3 del historial.

**Verificado**: backend 501 tests, lint y `tsc`; frontend 196 tests y `tsc`; migración aplicada desde cero
en un MySQL desechable sin diferencias con el schema. **NO verificado**: envío real de push ni pantalla en
navegador/iOS. **Necesita**: migración en prod ANTES de desplegar (SQL manual en `output/` por si Render no
las aplica), build nueva, y port a `dev` (Postgres).

## 2026-10-13 — Jornada: se ve la siguiente al acabar y aplazados/cancelados editables (fuera de sprint)

Dos peticiones del usuario con la misma raíz. **Comprobado** en la BD de dev: Premier J6 y Serie A J6 con 9
terminados y 1 LIVE desde la noche anterior (sin resultado aún), y LaLiga J8 con un CANCELLED; las tres
seguían siendo «la actual» aunque la siguiente ya estuviera abierta.

**Hecho (backend)**: `getOrders` solo cuenta los partidos que mantienen viva la jornada
(`keepsMatchdayCurrent`: ni aplazados, ni cancelados, ni empezados hace más de 3 h sin resultado); la de
respaldo puede ser una CLOSED; un CANCELLED cuenta como resuelto al cerrar la jornada (antes la dejaba CLOSED
para siempre) y ya no se pregunta por él al proveedor. Pronósticos: `isMatchEditable` deja crear o cambiar el
de un aplazado o cancelado (sigue mandando `canAcceptPredictions`); copiar pronósticos, recordatorios y la
jornada abierta siguen con `isMatchPredictable`. **Hecho (frontend)**: esos partidos ya no salen bloqueados,
llevan la etiqueta «Aplazado»/«Cancelado» y no encienden el punto rojo. Dos líneas en la 1.0.3 del historial.

**Verificado**: backend 493 tests y lint, frontend 192 tests y `tsc`. **NO verificado** en navegador ni iOS.
**Necesita**: desplegar el backend (lo de «la siguiente jornada» funciona ya con la app instalada; lo de los
aplazados necesita además build nueva). `dev` (Postgres) necesita el mismo cambio portado a mano.

## 2026-10-13 — Quiz: pestañas por cierre, reloj de menos de 24 h y punto rojo (fuera de sprint)

Petición del usuario. **Hecho** (solo frontend): las pestañas de liga del centro del Quiz van de la que
cierra antes a la que cierra más tarde (jornada abierta o programada con el cierre más próximo; las ligas sin
ninguna, al final) y la liga por defecto es la abierta que cierra antes. Reloj arriba a la derecha de la
pestaña si su jornada abierta cierra en menos de 24 h, y punto rojo (el mismo de Jornada) si el usuario no la
ha terminado. Punto rojo también en «Quiz» de la barra inferior: `QuizService` guarda el último resumen y la
barra lo vuelve a pedir al arrancar y al navegar (como mucho una vez por minuto) y al terminar un quiz.
**Verificado**: tests de las reglas nuevas, 195 tests del frontend y `tsc`. **NO verificado** en navegador
ni en iOS. Sin línea nueva en el historial: el Quiz entero es nuevo en la 1.0.3 y ya tiene la suya.

## 2026-10-12 — Quiz de jornada global: backend (fuera de sprint)

Petición explícita del usuario: evento por liga/jornada, preguntas variadas, partidos destacados,
clasificación general y por liga, acceso sin grupo y cierre al primer partido de la jornada. Reparto:
Codex backend/integración; Opus frontend. Plan y contrato en `quiz-jornada-plan.md`; entrega de API,
comprobaciones y preparación del entorno en `quiz-jornada-backend-handoff.md`.

**Hecho en backend**: tablas propias y migración aditiva, seis endpoints autenticados, publicación
de preguntas fijas, destacados, guardado parcial/idempotente, validación atómica y cierre irreversible
con bloqueo de fila, corrección/puntuación y rankings paginados por temporada sin grupos; procesos
de calendario independientes de grupos y cola compartida de llamadas al proveedor con cooldown 429.
Errores traducidos en los seis idiomas. Sin cambios de campos/rutas respecto al contrato v1.

**Verificado**: build backend; 480 tests en 35 suites (42 nuevos, incluidos ocho tests de integración
con MySQL real y Nest HTTP/JWT); migraciones aplicadas solo a `acerton_quiz_test` local. No aplicado
a la base habitual ni a producción. El lint estándar detecta finales CRLF preexistentes en el checkout;
no se modifican archivos ajenos para normalizarlos. Comprobación adicional de los 176 archivos backend
aceptando finales de línea del checkout (`endOfLine: auto`): 0 errores y 0 advertencias.

**Pendiente**: conectar/verificar las pantallas de Opus contra el servidor nuevo, aplicar migración
en el entorno de integración elegido, revisión móvil y comprobar calendarios del proveedor real.
No considerar la funcionalidad completa ni desplegada por tener el backend terminado.

## 2026-10-12 — Tabla: gráfica de líneas del grupo y "Rey del marcador exacto" (fuera de sprint)

A petición explícita del usuario (ver `decisions.md`, misma fecha). Rama `claude/clasificacion-grafica-lineas`.

**Hecho**: backend (`scores` en el historial y endpoint `rankings/exact-scores`, sin migración) y frontend
(gráfica de líneas por defecto en Semanal y en Total con selector Grupo/Tú, la de barras como modo
individual, tarjeta del rey del exacto en grupos de resultado exacto, textos en los seis idiomas, tokens de
color en claro y oscuro). Dos líneas de historial en la 1.0.3.

**Verificado**: backend 6 tests nuevos (`scores` del historial; exactos: grupo 1X2, solo marcadores
clavados y miembros actuales, empates, total por competición y "general", semanal con la última jornada o
la elegida) y lint; frontend 11 tests nuevos del facade (154 en total), `tsc`, `ng build` y
`check-changelog`. En el navegador (móvil, claro y oscuro, español y alemán) con una **API simulada**
(Docker/WSL no arrancaba en esta máquina, sin MySQL local): líneas en Total y Semanal, resalte de la
jornada elegida, lectura de puntos al tocar una jornada, leyenda que resalta una línea, cambio Grupo/Tú,
rey del exacto (acumulado y por jornada) y que en un grupo 1X2 no sale.

Después, backend contra **MySQL local** (Docker) con datos sembrados (2 grupos, 9 jugadores, 7 jornadas;
borrados al acabar): `scores` del historial, exactos en Total por liga y "general" y en Semanal, lista vacía
en el grupo 1X2; los recuentos coinciden con una consulta SQL independiente.

**NO verificado**: en iOS/Android.

**Necesita**: desplegar el backend (sin él, solo sale la gráfica individual y no sale el rey del exacto) y
build nueva del frontend. El backend de `dev` (Postgres) necesita el mismo cambio a mano.

## 2026-10-12 — Avisos con el grupo y puntos de toda la jornada (fuera de sprint)

Aviso del usuario: los avisos de un grupo no decían de qué grupo eran, y el de jornada terminada
("Has ganado X puntos") parecía hablar de un resultado y no de la jornada. **Comprobado** en la BD de
dev (Neon): el número ya era la suma de toda la jornada en ese grupo (coincide con la Tabla semanal);
lo confuso era el texto: título "Regular Season - 6 terminada" sin grupo ni liga, idéntico en cada grupo.

**Hecho** (solo backend, `NotificationsService`): título con el nombre del grupo en jornada terminada
y en partidos por pronosticar ("Los del bar · Jornada 6 terminada"), "Regular Season - N" pasa a
"Jornada N", y el cuerpo dice la liga y "en total": "Has sumado 7 puntos en total en la jornada 6 de
La Liga. Vas 1º en la clasificación del grupo." Línea en la 1.0.3 del historial. **Verificado**: tests
de notificaciones y jobs (54), `tsc`. Funciona al desplegar el backend, sin build. Los avisos siguen
solo en español (texto generado en el servidor), igual que antes.

## 2026-10-05 — Catalán, francés, italiano y alemán (fuera de sprint)

A petición explícita del usuario (ver `decisions.md`, misma fecha). **Hecho**: cuatro idiomas nuevos en
interfaz (853 textos cada uno), errores del servidor (58 + 3 con datos), correos y novedades de versión;
selector en Perfil > Apariencia, detección del dispositivo y carga del idioma bajo demanda (paquete inicial
587 → 406 kB). Dentro de la **1.0.3**. **Verificado**: backend 438 tests, frontend 143 (coherencia de claves,
marcadores, plurales y saltos de línea en los cinco idiomas, detección, locale), `ng build` de producción;
en Chromium: detección por idioma del dispositivo, descarga solo del idioma usado, cambio de idioma desde
Perfil > Apariencia, 19 pantallas por idioma sin textos cortados ni desbordes (tras acortar dos rótulos en
alemán) y las frases montadas con fragmentos. **No probado** en un iPhone real. Sin revisión de nativos:
ver `decisions.md`. Necesita build nueva (frontend e iOS); el servidor ya contesta en los seis al
desplegar.

## 2026-10-05 — Hora de los partidos: horas provisionales del proveedor (fuera de sprint)

Aviso del usuario ("en jornadas sale 11/10 a las 2 de la mañana en todos los partidos"; La Champions bien).
Causa, solución y matices: `decisions.md` (misma fecha).

**Hecho**: backend (`refreshUnconfirmedKickoffs` + cron horario, arregla los datos **sin build**) y frontend
(«Hora por confirmar» en vez de las 2:00, **necesita build**). Línea de historial en la 1.0.3.

**Verificado**: tests nuevos (backend: la heurística, el refresco —solo candidatos correctos, sin petición si no hay
horas provisionales, corrige hora y cierre, no toca nada si el proveedor sigue sin hora, cron que no se cae
si falla el proveedor—; frontend: la heurística), `tsc`, lint, `ng build` y, en Chromium con la app real y un
partido con la hora provisional puesta a mano en la base de datos (restaurado), en español e inglés: sale
«Hora por confirmar» y los demás partidos conservan su hora.

**NO verificado**: contra football-data.org real (sin clave aquí): no sé qué devuelve ahora para La Liga ni si ya
tiene horas confirmadas; el refresco nuevo lo comprobará cada hora desde que se despliegue.

## 2026-10-05 — Nombre corto de los equipos en las imágenes de compartir (fuera de sprint)

A petición explícita del usuario (ver `decisions.md`, misma fecha). **Hecho**: columnas `homeTeamShort` y
`awayTeamShort` en `matches` (**migración que hay que aplicar en producción antes de desplegar el
backend**), mapeo del `shortName` de football-data.org, relleno automático de los partidos ya guardados
(cron horario) y `shortTeamName` en las dos imágenes de compartir. **Verificado**: tests de backend
(mapeo con una respuesta real de la API, relleno, cron) y de frontend; en Chromium con datos sembrados
("Barça · Valencia", "Santander · Osasuna", y el nombre completo si el partido aún no tiene el corto).
Frontend **necesita build nueva**.

## 2026-10-05 — Tabla por jornadas: solo en Semanal, orden J1, J2, J3 y 0 puntos si no se jugó (fuera de sprint)

A petición explícita del usuario (ver `decisions.md`, misma fecha). **Hecho**: selector de jornada solo en
Semanal (nunca en Total) y en orden cronológico, centrando la jornada elegida; el backend
(`RankingsService.getRankingForMatchday`) devuelve a todos los miembros, con 0 puntos los que no tienen
fila en esa jornada. Línea de la 1.0.3 reescrita. **Verificado**: 4 tests de backend (jornada sin filas,
jugador que entró después, empates a 0, tabla completa sin cambios) y los del facade reescritos. Frontend
**necesita build nueva**; los 0 puntos funcionan al desplegar el backend.

## 2026-10-05 — Tabla por jornadas, flecha de "Tu evolución" y contador de insignias (fuera de sprint)

A petición explícita del usuario (tres avisos seguidos al probar la build 1.0.3). Solo frontend;
**necesita build nueva**. Reglas y decisiones por defecto de la clasificación por jornada:
`decisions.md` y `product-rules.md` (misma fecha).

**Hecho**:
- **Tabla por jornadas**: selector de jornada en cada liga (después limitado a Semanal, ver la entrada
  anterior; `RankingsPageFacade`, `rankings-page.component.html`).
- **"J3 &rarr; J7" salía con la entidad escrita**: la flecha quedó como `&rarr;` en los catálogos de
  idioma al migrar los textos (ahí no se decodifica); ahora es el carácter, y un test falla si algún texto
  del catálogo lleva una entidad HTML. La etiqueta "J3" estaba escrita a mano: ahora usa la abreviatura
  traducida (MD3 en inglés).
- **"13 conseguidas" teniendo 5** (error anterior a la traducción): una insignia se concede por grupo
  (una fila por usuario, insignia y grupo) y el contador contaba filas. Ahora cuenta insignias
  distintas (`distinctBadgeCount`), en Perfil y en la pantalla de insignias. No se arregla en el
  backend porque "insignia desbloqueada" de los resultados de la jornada necesita las filas por grupo.
- Línea de historial en la 1.0.3 para la clasificación por jornadas y el contador.

**Verificado**: 12 tests nuevos (selector de jornada: petición de la jornada elegida, volver a la
última, mantener la jornada al cambiar de periodo, reinicio al cambiar de liga, respuesta tardía descartada,
quinielas de esa jornada; contador de insignias; guarda de entidades HTML), `tsc`, `ng build` y, en
Chromium con MariaDB + backend + app y 4 jornadas finalizadas sembradas (borradas después), en español e
inglés: la lista de jornadas, el cambio de clasificación semanal/total, el resumen "Jornada N" y tocar un
jugador.

**NO verificado**: iOS/Android reales. **Pendiente**: el usuario avisó de que "la fecha de los
partidos sale mal" sin decir dónde ni cómo debería verse; sin concretar.

## 2026-10-05 — Teclado en iOS: el último marcador ya no queda tapado (fuera de sprint)

A petición explícita del usuario. Causa, solución y matices: `decisions.md` (misma fecha). Solo
frontend (`KeyboardInsetService`, `styles.scss`); **necesita build nueva**. Versión **1.0.3** (nueva entrada
arriba en `changelog.ts` con este arreglo y el del pop-up de nivel, y `MARKETING_VERSION` 1.0.3).

**Verificado**: 8 tests nuevos (cálculo del desplazamiento; con una página larga y un campo al final:
sube hasta dejarlo encima del teclado y la barra "Listo", también al cambiar de campo, quita el hueco al
cerrar y no mueve un campo que ya se ve) y, en Chromium con la app real (Jornada, grupo de resultado
exacto, 375×667) simulando el teclado superpuesto de 300 px: antes el último marcador quedaba 99 px
dentro de la zona tapada y después queda por encima, también al pasar al campo anterior.

**NO verificado**: en un iPhone real (la simulación no incluye el teclado ni los eventos de
`@capacitor/keyboard`, que solo existen en nativo): hay que probar en TestFlight que sube bien con
el teclado numérico, que la barra "Listo" no se solapa y que al cerrar el teclado no da un salto.

## 2026-10-05 — El pop-up de "subiste de nivel" sale una sola vez (fuera de sprint)

A petición explícita del usuario. Reglas, matices y por qué se hizo en el servidor:
`decisions.md` (misma fecha, sustituye la regla del pop-up de Sprint 14).

**Hecho**: `NotificationsService.getFeedForUser` deja leídos los `LEVEL_UP` sin leer después de
devolverlos como sin leer una vez. Solo backend, sin migraciones y sin build nueva de la app.

**Verificado**: 4 tests nuevos del servicio (marca solo los de nivel sin leer, no toca otros tipos
ni los ya leídos, un fallo no tumba el feed), tests/`tsc`/lint del backend, y de punta a punta
en Chromium con MariaDB + backend + la app sin cambios: con un aviso de nivel sin leer sale el
pop-up y queda leído en BD, al abrir de nuevo la app no sale, un aviso de nivel nuevo sí sale una
vez, y en Avisos no queda ninguno sin leer.

**NO verificado**: iOS/Android reales ni la entrega del push.

## 2026-10-05 — Historial de versiones y pop-up de novedades (fuera de sprint)

A petición explícita del usuario. Misma rama (`claude/dashboard-push-notifications-yo0gk0`,
reiniciada desde `main` tras fusionar el PR #76). Cómo funciona y decisiones por defecto:
`decisions.md` (misma fecha); la regla de mantenimiento, en `CLAUDE.md`.

**Hecho**: historial en `core/changelog/changelog.ts` (entrada 1.0.2, es/en),
`WhatsNewService` + `WhatsNewDialogComponent`, llamada desde `ShellFacade.init`, y
`scripts/check-changelog.mjs` en CI (versión de arriba del historial = `MARKETING_VERSION`).
Solo frontend y CI, sin backend ni migraciones.

**Verificado**: `ng build`, 90 tests del frontend (reglas de versión y de cuándo enseñar,
validación de la estructura del historial, servicio y diálogo en es/en) y el script de CI
(pasa con 1.0.2 y falla con una versión distinta). De punta a punta en Chromium (375 px,
claro y oscuro): usuario existente sin versión guardada lo ve una vez y no al recargar,
con versión anterior guardada vuelve a salir, con una más nueva no sale ni se pisa, en
inglés sale en inglés, y un usuario sin tutorial hecho no lo ve pero se apunta la versión;
sin errores de consola.

**NO verificado**: en iOS real (la versión nativa sale de `App.getInfo()`, que solo existe en
nativo: en web se prueba con la última entrada del historial); Android (ver `decisions.md`).
En TestFlight, quien ya tenga una build 1.0.2 con esta función solo lo verá la primera vez;
para volver a verlo hay que reinstalar la app.

## 2026-10-04 — Inglés en toda la app (fuera de sprint)

A petición explícita del usuario. Misma rama (`claude/dashboard-push-notifications-yo0gk0`),
commits aparte. Cómo funciona y qué se decidió por defecto: `decisions.md` y
`product-rules.md` ("Idioma"), misma fecha.

**Hecho**: i18n propio en el frontend (~850 claves, es/en tipados), selector en
Perfil > Apariencia, `Accept-Language` al backend, errores del backend y correos
(confirmar correo, restablecer contraseña) en el idioma de la petición. Insignias
traducidas por código en el cliente.

**Verificado**: `ng build` (AOT, comprueba las plantillas), 64 tests del frontend
(coherencia es/en: mismas claves, mismos marcadores, plurales completos), 398 del
backend (incluye un test que falla si un mensaje de error del código no tiene
traducción) y lint/prettier de los ficheros tocados. De punta a punta en Chromium con
MariaDB + backend + Angular: recorrido de 39 pantallas en español comparado con una
captura anterior a los cambios (solo difieren las mejoras señaladas en `decisions.md`),
recorrido en inglés sin texto en español salvo datos de usuario/competiciones,
cambio de idioma desde Apariencia (se guarda, recarga y persiste), detección por el
idioma del dispositivo (en → inglés, fr → español), hoja de copiar pronósticos y estado
vacío de grupos en inglés, errores y correos en inglés con `curl`, sin desbordes
horizontales a 375 px.

**NO hecho / NO verificado**: avisos push y feed de avisos en inglés (necesita una
migración, ver `decisions.md`); iOS/Android (solo web/local); los textos legales no
están revisados por nadie; solo se miró el aspecto del inglés a 375 px en las
pantallas principales, no todas las hojas y diálogos; el idioma de fechas relativas
("hace 5 min") y de nombres de día está probado solo en el recorrido, no con casos
límite.

## 2026-10-04 — Copiar pronósticos de otro grupo (fuera de sprint)

A petición explícita del usuario. Misma rama que el trabajo de comunicados push
(`claude/dashboard-push-notifications-yo0gk0`), commit aparte. Reglas y motivos
en `decisions.md` y `product-rules.md` (misma fecha).

**Actualización (mismo día)**: el selector ya no esconde los grupos que no se pueden
copiar: lista todos los otros grupos con pronósticos de la jornada, y los no
copiables salen desactivados con el motivo (otro modo / partidos ya empezados).
Motivo del cambio: "solo me sale uno cuando tengo marcado en 3 grupos" — con tres grupos
del mismo modo salían los tres (comprobado), así que lo que se veía como "faltan"
eran grupos de otro modo o de partidos ya empezados, sin ninguna explicación.

**Backend**: `PredictionsService.getCopySources` y `copyFromGroup`
(`GET /groups/:id/predictions/copy-sources/:matchdayId`, `POST
.../copy-from/:sourceGroupId` con `{ matchdayId }`), solo entre grupos del mismo
modo de puntuación; el tratamiento de comodines es lógica pura en
`predictions/copy-predictions.util.ts` (`planCopy`). Sin migraciones. **Frontend**: botón en `/matchday` (`CurrentMatchdayFacade.
openCopySheet`), panel `CopyFromGroupSheetComponent`, confirmación si ya hay
pronósticos, y mensajes en `domain/copy-predictions.rules.ts` (toast si todo
bien; diálogo si algo no se copió o se copió sin comodín).

**Verificado** (y repetido tras fusionar con `main`, incluido el PR #72 de jornadas
siempre abiertas): 380 tests del backend, `tsc`, lint y prettier; 51 del frontend
(karma) y `ng build` de producción. De punta a punta en Chromium con MariaDB real +
backend + app Angular y login por la interfaz (usuario con 4 grupos, 1X2 y
resultado exacto, una jornada con un partido ya empezado y clasificaciones
sembradas para tener comodines): copiar a un grupo vacío, copiar sobre
pronósticos existentes (confirmación y cancelar), editar tras copiar (no toca el
origen), el selector solo lista grupos del mismo modo (y la API rechaza con 400
copiar entre modos distintos, en los dos sentidos), partido empezado omitido,
doble oportunidad sin comodín en el destino (omitida, avisada) y "x2" sin comodín
(copiado sin duplicador, avisado), todo comprobado también en BD y sin errores de
consola ni peticiones 4xx/5xx.

**NO verificado**: iOS/Android (solo web/local) ni el aspecto con textos largos de
nombre de grupo; el botón se pinta siempre que haya más de un grupo aunque
ningún otro tenga pronósticos de esa jornada (entonces avisa al pulsarlo, para no
pedir una consulta extra en cada navegación).

## 2026-10-04 — Enviar una notificación a todo el mundo desde piqo-dashboard; fuera el endpoint de prueba (Sprint 9)

A petición explícita del usuario ("lo de probar notificaciones debería desaparecer,
y deberíamos añadir un endpoint que solo desde piqo-dashboard se pueda lanzar...
título y descripción, botón enviar y pop-up para confirmar").

**Eliminado**: `POST /notifications/test-broadcast` y `NotificationsService.sendTestBroadcast`
(y su método huérfano en el frontend). Era un agujero real: lo podía lanzar
**cualquier usuario con sesión** y mandaba un push de prueba a *todos* los
dispositivos registrados. Hay un test de regresión que comprueba que ya no existe.

**Nuevo endpoint** `POST /api/dashboard/send-notification` (API de Piqo):
- Sin JWT de usuario (`@Public()`): el único control de acceso es
  `DashboardApiKeyGuard` — clave compartida `DASHBOARD_API_KEY` en la cabecera
  `X-Dashboard-Key`, comparación en tiempo constante. Sin clave configurada (o de
  menos de 32 caracteres) responde 503 (desactivado, nunca abierto); clave
  ausente/incorrecta, o un JWT de usuario, 403. Limitado a 5 peticiones/min.
- Cuerpo: `title` (1–65), `body` (1–240), `dryRun` opcional (solo cuenta a cuántos
  usuarios/dispositivos llegaría, sin enviar). Campos desconocidos → 400.
- Envía a todos los `NotificationToken` por lotes de 500 (límite de FCM; el
  envío anterior de un solo golpe habría fallado con más de 500 dispositivos) y
  devuelve `totalUsers`, `usersWithDevices`, `tokenCount`, `successCount`,
  `failureCount` y los fallos agrupados por código. Sin Firebase configurado
  responde 503 en vez de decir que se envió. Los tokens que FCM da por inválidos
  se borran, como en el resto de envíos.
- **No** crea fila en el feed "Avisos" ni respeta preferencias por tipo: un anuncio
  no es ninguno de los tipos existentes y añadir uno (`ANNOUNCEMENT`) exige migrar
  el enum `NotificationType` en la BD de producción (la gestiona un compañero:
  habría que darle el SQL). Pendiente si se quiere verlos también en "Avisos".

**Dashboard** (repo aparte `piqo-dashboard`, rama `feature/send-notification`):
sección "Enviar notificación" con título y descripción (con contadores) y botón
**Enviar**; al pulsarlo no se manda nada: calcula a cuántos llegaría (dryRun) y sale
un pop-up (`<dialog>`) con la vista previa y "Llegará a N de M usuarios (K
dispositivos)"; solo **Enviar a todos** lo envía. Sin destinatarios, el botón del
pop-up se desactiva. Su servidor reenvía a la API con la clave (nunca llega al
navegador), exige JSON + cookie SameSite=Strict y deja 10 s mínimo entre envíos
reales. Sigue funcionando sin la clave (el envío responde 503).

**Para activarlo en producción** (lo hace el usuario, son secretos): generar la
clave (`openssl rand -hex 32`), ponerla como `DASHBOARD_API_KEY` en el servicio
`piqo` (API, Render) y en `piqo-dashboard` (más `PIQO_API_URL=https://api.piqo.es/api`).

**Verificado**: 355 tests del backend (nuevos: guard, DTO, envío por lotes/fallos/dryRun/
sin Firebase, y protección del controlador) y 10 del dashboard. En local, por HTTP
contra la API: 403 sin clave, con clave mala y con JWT de usuario; 200 con `dryRun`;
400 por validación; el antiguo test-broadcast da 404. En el navegador, dashboard +
API reales: el botón está desactivado hasta tener título y descripción, el pop-up
muestra vista previa y destinatarios, Cancelar no envía nada, y confirmar ejecuta el
envío (con tokens falsos que FCM rechazó: "0 entregadas · 2 fallidas", registrado
en el log). **No verificado**: una entrega real a un dispositivo (el flujo de FCM
con tokens válidos solo está cubierto por tests con un FCM simulado) ni el límite de
10 s entre envíos desde la interfaz (solo en test unitario).

## 2026-10-04 — La jornada más próxima siempre está abierta para pronosticar (fuera de sprint)

A petición explícita del usuario ("haz que siempre haya la jornada más
próxima abierta, tal y como funciona ahora la lógica pero siempre debe haber
una jornada abierta para pronosticar"). Hasta ahora una jornada solo admitía
pronósticos cuando le tocaba por orden **y además** faltaban menos de 4 días
para su primer partido (`PREDICTIONS_OPEN_BEFORE_MS`): en un parón de
selecciones, o justo tras acabar una ronda, no había ninguna jornada abierta
y la pantalla decía "Próxima · abre en…" con los partidos en "Aún no".

**Qué cambia** (la lógica de *cuál* es la jornada actual no se toca, ver
`decisions.md` 2026-09-19):
- **Sin ventana horaria**: `canAcceptPredictions` = `canPredict`. La jornada que
  le toca está abierta desde el momento en que le toca, falten 2 días o 3
  semanas. Frontend (`pickingAllowed`, punto rojo) y `/groups/mine`
  (`hasPendingPicks`) igual.
- **Hueco de las últimas horas** (nuevo `predictLimitOrder`): si a la jornada
  actual ya no le queda ningún partido por empezar (los últimos están en
  juego y la jornada aún no es FINISHED), también se admite la siguiente, la
  del próximo partido que sí está por empezar. Dos jornadas por delante
  siguen bloqueadas (no se rellenan semanas de golpe).
- **Que exista una siguiente**: nuevo cron `JobsService.ensureUpcomingMatchdays`
  (cada 10 min, conteo barato en BBDD) + `MatchdaysService.ensureUpcomingMatchday`:
  si una competición usada por algún grupo no tiene nada por empezar, trae la
  jornada en curso del proveedor y, si hace falta, pide ya la siguiente por
  número (solo rondas numeradas de liga; no adivina eliminatorias).
  Reintentos espaciados (3 h) si el proveedor no trae nada nuevo. Antes la
  siguiente jornada solo se traía cuando no quedaba ninguna pendiente y con un
  cron de 12 h.
- **Compatibilidad**: el backend sigue enviando `opensAt`, pero nunca posterior
  a "ahora" cuando la jornada admite pronósticos, para que las versiones de la
  app ya instaladas (que bloquean en cliente por `opensAt`) también funcionen.
  La app nueva ya no lo lee. Una jornada que aún no le toca (previsualizada con
  "siguiente") muestra "Próxima · empieza en" en vez de "abre en".

**Verificado**: 333 tests del backend (nuevos: sin ventana de 4 días, parón de
3 semanas, hueco de las últimas horas, dos jornadas por delante, `opensAt`
compatible, `ensureUpcomingMatchday` y su cron) y 45 del frontend. En local
(backend + MySQL), con una jornada a 10 días: la API devuelve
`canPredict: true` y `opensAt` = ahora, un pronóstico a un partido a 10 días
se acepta (HTTP 201), y en la pantalla Jornada sale "Abierta · cierra en
9d 23h", 20 campos de marcador habilitados, ningún "Aún no" y el punto rojo
de pendientes. **No verificado en vivo**: el cron/proveedor (no hay clave de
football-data en local; solo tests con el proveedor simulado) ni iOS/Android.


## 2026-10-04 — Rendimiento: cambiar de pestaña al instante (fuera de sprint)

A petición explícita del usuario ("cuando pulso para cambiar de vista, pulso
y se cambia la vista al cabo de 1s, debería ser instantáneo"; tras probar
una primera vuelta, "sigue yendo muy lag"). Hasta ahora cada cambio de
pestaña (Jornada, Grupos, Tabla, Perfil) esperaba ~1 s de red antes de que
la vista cambiara.

**Causa**: `hasGroupGuard` pedía `GET /groups/mine` en cada navegación y no
activaba la ruta hasta que respondía, y ese endpoint era el más pesado de la
app (55-64 consultas a la BD con solo 6 grupos × 2 ligas, muchas en serie:
la jornada actual se recalculaba por cada grupo y cada competición, y
`getCurrentMatchdayForCompetition` repetía `getReferenceOrder`). Con la BD
remota cada consulta suma decenas de ms. Además Grupos volvía a pedir la
misma lista con spinner, Tabla encadenaba grupo → clasificación en serie, y
CORS no cacheaba el preflight (cada petición con `Authorization` costaba dos
viajes).

**Cambios**: (1) `hasGroupGuard` deja pasar al instante cuando el grupo
activo ya está en memoria y refresca la lista por detrás (sigue pidiéndose en
cada navegación, así los puntos rojos se actualizan; espera a la red solo la
primera vez o si el grupo activo aún no está en la lista, p. ej. recién
creado; si el refresco descubre que ya no quedan grupos, redirige igual).
(2) `/groups/mine`: jornada actual una vez por competición y en paralelo,
pronósticos de todos los grupos en una sola consulta (55-64 → ~22 consultas).
(3) `getCurrentMatchdayForCompetition` no repite `getReferenceOrder`.
(4) CORS `maxAge: 86400`. (5) Grupos pinta la lista en memoria sin spinner y
refresca por detrás. (6) Tabla usa el grupo de `/groups/mine` para pedir la
clasificación de inmediato (con `untracked` en el `effect`: sin él, el
refresco por detrás de la lista recargaba la clasificación en bucle).

**Medido** en navegador (backend + MySQL locales, +100 ms simulados por
petición, mismo script antes/después): la ruta pasa a activarse en ~15 ms
(antes 144-187 ms) y el contenido de Tabla/Perfil/Jornada llega en ~135-155 ms
(antes 295-455 ms); Grupos pasa de 144 ms a 11 ms. 33 tests del frontend y
304 del backend en verde.

**No se toca / pendiente**: Jornada y Perfil siguen mostrando spinner un
viaje al entrar (ya no esperan nada antes); si se quiere ver contenido
cacheado al instante habría que cachear sus datos por grupo. No se ha medido
el coste de pintado en el dispositivo (fondo animado + `backdrop-filter`):
si tras esto sigue notándose lag en iPhone, ese es el siguiente sospechoso.

## 2026-10-04 — Renombrar el grupo siendo admin (Sprint 3, fuera de sprint)

A petición explícita del usuario ("que se pueda cambiar el nombre del grupo
si eres admin"). Hasta ahora el nombre quedaba fijado al crear el grupo.

**Backend**: `UpdateGroupRulesDto` (`PATCH /groups/:id/rules`) gana `name`
opcional (3–60 caracteres, mismos límites que `CreateGroupDto`, recortado con
`@Transform` antes de validar para que "  ab  " no cuele). Reutiliza el
endpoint de ajustes en vez de uno nuevo porque ya exige `assertIsAdmin`
(el creador también es admin) y es el que usa el único botón "Guardar
cambios" de la pantalla. Un miembro normal recibe 403.

**Frontend** (`/groups/:id/settings`): sección "Nombre del grupo" arriba del
todo, **solo visible para admins** (los miembros ya ven el nombre en la
cabecera). Entra en el mismo flujo de "Guardar cambios" que reglas y
toggles; un nombre inválido (<3 o vacío) bloquea el guardado entero con un
aviso, en vez de guardar a medias el resto de cambios pendientes. Al guardar
se actualiza el nombre en el listado de grupos y en el selector de la barra
superior sin esperar a la siguiente recarga.

**No se toca**: los avisos ya generados (`Notification`) conservan el nombre
que tenía el grupo al crearse, no se reescriben. No hay historial de nombres
ni límite de frecuencia de cambio (no pedido).

Tests: 12 nuevos en el backend (`updateRules`, `assertIsAdmin` y validación del
DTO) y 8 en el frontend (fachada de ajustes del grupo). **Verificado en
navegador** (web, backend + MySQL locales): el admin ve la sección, renombra,
la cabecera cambia y persiste en BD; por HTTP directo, un miembro normal
recibe 403 y un nombre de 2 caracteres 400. Sin verificar en iOS/Android.
PR #70 (ya en `main`).

## 2026-09-19 — Orden estable de jornadas por cierre de pronósticos (Sprint 5) — dos vueltas

**Primera vuelta**: a petición explícita del usuario, con reglas y
ejemplos concretos que resolvían la pregunta pendiente desde el
2026-09-10, `getCurrentMatchdayForCompetition` pasó a ordenar por
`closesAt` ascendente en vez de `order` ascendente. Mergeado a `dev` vía
PR #33.

**Segunda vuelta (mismo día, tras probar en `dev`)**: el usuario reportó
"sigo viendo la jornada 6 en vez de la 7". La primera vuelta no bastaba:
`closesAt` se fija al crear la jornada como el kickoff de su PRIMER
partido y no se mueve cuando se aplaza uno posterior — verificado contra
la base de datos real de `dev` (La Liga: jornada 6 con 9/10 partidos
jugados y el último aplazado al 21 de octubre, jornada 7 jugándose hoy/
mañana; cero pronósticos registrados para la jornada 7 en ningún grupo de
prueba, confirmando que además bloqueaba pronósticos reales, no solo el
display). Ver `decisions.md` para el detalle completo de la causa raíz y
la verificación por SQL directo.

**Fix real**: nuevo criterio basado en el kickoff del próximo partido SIN
TERMINAR de cada jornada (recalculado sobre partidos reales, no un campo
guardado) — `MatchdaysService.getReferenceOrder` sustituye a
`getEarliestPendingOrder`, usado tanto por `getCurrentMatchdayForCompetition`
como por `attachCanPredict`/`canAcceptPredictions`. Confirmado con el
usuario antes de ampliar el alcance (esto sí toca la aceptación real de
pronósticos, no solo qué se muestra). Verificado con SQL contra los datos
reales de `dev` antes de dar el fix por bueno: la jornada 7 pasa a ganar.
282 tests del backend en verde, `tsc --noEmit` limpio. **Sin verificar en
navegador todavía** (verificado por SQL/tests, no hay sesión de navegador
en esta vuelta). Rama `fix/matchday-reference-order-by-next-kickoff`, PR
pendiente de abrir tras esta entrada.

Además, un PR de solo documentación (#34, refleja el merge de la primera
vuelta) sigue **abierto sin mergear** — un intento de merge fue bloqueado
por el clasificador de modo automático de Claude Code ("Merge Without
Review"); pendiente de que el usuario lo fusione él mismo o lo autorice
explícitamente en una futura sesión.

## 2026-09-17 — Compartir imagen de un partido individual (fuera de sprint, sin issue)

A petición explícita del usuario ("añade una opcion de compartir con un
boton... en cada partido... tanto en los partidos 1x2 y resultados
exactos"), sobre la pantalla `/matchday` ("Tu jornada"): cada fila de
partido tiene ahora un botón circular pequeño y discreto (icono
"compartir", teñido levemente en acento/dorado a petición del usuario tras
verlo demasiado apagado, a la izquierda de los nombres de los equipos) que
abre `MatchShareCardComponent`, un canvas nuevo en formato **vertical
1080×1920** (a diferencia del cuadrado 1080×1080 de "Compartir imagen" de
la jornada completa, del 2026-09-14) pensado para Instagram Stories/Reels/
TikTok.

**Diseño, tras dos vueltas de feedback explícito del usuario** ("quita los
circulos con los numeros y pon el resultado debajo del nombre... no me
gusta esto de separar el partido en otro cuadro que ponga tu pronostico"):
una única tarjeta (sin escudos ni "VS" grande en medio, que quedaba raro en
resultado exacto y separaba el pronóstico del partido en otra caja aparte).
Nombre de cada equipo con su marcador real justo al lado (si el partido ya
acabó) en su propia fila, igual que ya se lee en la lista real de "Tu
jornada"; debajo, sin caja aparte, "Tu pronóstico": en modo 1X2 siempre se
ven las 3 casillas 1/X/2, con la(s) elegida(s) en acento/dorado — con doble
oportunidad (p.ej. "1X") se pintan las dos casillas que cubre, no solo una,
tal como pidió el usuario explícitamente; en resultado exacto, el marcador
predicho en grande ("3-0"), con nota "COMODÍN x2" si aplica. Si el partido
ya terminó, una sola línea de texto (no una caja) con acierto/fallo y
puntos, reutilizando `matchAccentTone`/`pointsForPrediction` de
`domain/prediction-rules.ts` — nada de lógica nueva de puntuación. Sin
logos de equipo reales (`Match.homeTeamLogo`/`awayTeamLogo` no se usa en
ningún sitio de la app todavía y son URLs externas — arriesgaba "manchar"
el canvas por CORS e impedir exportar el PNG), y ya no hacían falta al
quitar los escudos circulares. Sin el texto de ayuda "Formato vertical
1080×1920..." bajo la vista previa (quitado a petición explícita).

Tres retoques finales, todos a petición explícita: (1) el logo real de
Piqo (`/piqo/logo-oscuro.svg`, mismo `drawImage` con fallback a texto que
ya usaba `MatchdayShareCardComponent`) faltaba en la cabecera del canvas —
`drawBrand`/`drawCard` se pasaron a async para cargarlo igual que la
tarjeta de jornada completa. (2) Primer intento de "hay mucho espacio
abajo": se agrandó tipografía/espaciado de toda la tarjeta (900→1080px de
alto, nombres de equipo 52→58px, casillas 1/X/2 180→220px, etc.). (3) El
usuario aclaró que solo quería el logo más grande, no el resto — se
revirtió (2) a sus medidas originales y en su lugar se agrandó solo el
logo (174×55 → 262×83px, mismo sitio en la cabecera).

**Rediseño del cuerpo de la tarjeta siguiendo una referencia visual del
usuario** (un mock HTML exportado desde un artifact de Claude —
`C:\Users\34655\Downloads\Design.html`, un bundle offline; renderizado en
un servidor estático local temporal para poder inspeccionar sus estilos
computados vía DevTools, ya que el archivo no se puede leer como texto
plano y `file://` no es navegable desde la extensión de automatización).
Petición explícita: "mantén el fondo que ya tenemos y el logo pero por lo
otro, sigue el estilo que te pasaré" — no aplicar el mock al 100%, solo su
lenguaje visual. Fondo/bloom/líneas diagonales y el logo real no se
tocaron. El resto vuelve a traer círculos de equipo (revirtiendo la
petición anterior de quitarlos, ahora superada por esta referencia más
reciente): local relleno en acento con sombreado diagonal sutil,
visitante oscuro con aro en acento y el mismo sombreado en tinte acento;
iniciales cortas dentro, nombre completo debajo, "VS" centrado entre
ambos (sustituido por el marcador real si el partido ya terminó, mismo
sitio). Debajo, un único divisor y luego el pronóstico: en 1X2, las 3
casillas 1/X/2 llevan ahora el nombre del equipo (o "Empate") debajo del
número/letra, tal como en la referencia; en resultado exacto, dos casillas
cuadradas con el marcador predicho (local relleno, visitante con aro) y un
guión entre medias, en vez del texto plano "3-0" de antes. Colores propios
de Piqo mantenidos (no se copiaron los tonos exactos del mock, que son
casi idénticos de todas formas) para no romper consistencia con el resto
de la app. `drawRoundRect` (`canvas-draw.util.ts`, compartido con
`MatchdayShareCardComponent`) ganó un parámetro `strokeWidth` opcional
(por defecto 1, sin cambiar el comportamiento existente) para poder pintar
bordes más gruesos en los círculos/casillas nuevas.

`tsc --noEmit`, `ng build` y los 17 tests del frontend en verde. Verificado
en navegador con `demo-tu@piqo.test` (la sesión expiró a media prueba tras
un recompilado de `ng serve`, había que reautenticar — nada relacionado
con este cambio): grupo 1X2 con pick sencillo pendiente y con partido ya
finalizado en fallo (marcador real "0 - 2" en el sitio del VS, "Fallo · 0
pts" en rojo debajo de las casillas, nombre largo "Ipswich Town FC" con
elipsis en la casilla como es esperable), y grupo `EXACT_SCORE` con
comodín de remontada activo ("3" relleno / "0" con aro + "COMODÍN x2").
Doble oportunidad con las dos casillas en acento no verificada en vivo en
esta vuelta tampoco (mismo motivo que antes: ningún grupo de prueba
disponible tenía el comodín listo) — lógica sin tocar respecto a la
verificación de código ya hecha anteriormente. Sin verificar iOS/Android
(solo web). Rama `feature/match-share-card`, sin commit todavía.

**Refactor de paso**: las funciones de dibujado de canvas (texto con
letter-spacing, `roundRect` a mano por el bug conocido de iOS <16.4,
círculos, elipsis, carga de imagen) y la lógica de compartir/copiar/
descargar (Web Share con fallback a descarga, portapapeles con timeout de
4s por promesas que se quedan colgadas en algunos navegadores) se
extrajeron a `frontend/src/app/shared/canvas-share/` (`canvas-draw.util.ts`,
`share-image.util.ts`) y `MatchdayShareCardComponent` (jornada completa) se
reescribió para usarlas en vez de tener su propia copia — mismo
comportamiento, solo para no duplicar ese código ya afinado en dos sitios.

`tsc --noEmit`, `ng build` (con el aviso preexistente de presupuesto de
`current-matchday.component.scss`, ya superado antes de este cambio) y los
17 tests del frontend en verde tras cada vuelta. Verificado en navegador
(`ng serve` + `nest start:dev`, Postgres de Docker) con la cuenta real
`demo-tu@piqo.test`, ya con el diseño final: grupo 1X2 con pick sencillo
"1" sin acabar, el mismo partido ya finalizado con fallo real ("Fallo · 0
pts" en rojo, marcador real 0-2 junto a cada equipo), y grupo `EXACT_SCORE`
con comodín de remontada activo ("3-0" + "COMODÍN x2") — comodín activado y
retirado de nuevo con el mismo flujo real de la app (`Quitar comodín`) para
no dejar sucio ese grupo de pruebas. La doble oportunidad 1X2 con las dos
casillas en amarillo no se pudo forzar en vivo (ninguno de los grupos de
prueba 1X2 tenía comodín de doble oportunidad disponible en esta sesión) —
confiado por revisión de código: la tabla de parejas usada es una copia
literal de `DOUBLE_CHANCE_COVERAGE` (`prediction-rules.ts`, ya cubierta por
`prediction-rules.spec.ts`) y reutiliza el mismo bucle de casillas ya
verificado en vivo para una sola selección. Botón "Copiar" ejecuta el flujo
completo de portapapeles (incluido el timeout de seguridad de 4s, mismo
comportamiento ya conocido del botón equivalente de la jornada completa).
"Compartir imagen" no se disparó de verdad (abriría el panel nativo del
SO) pero usa la misma rutina ya verificada del canvas de jornada completa.
Sin verificar iOS/Android (solo web). Rama `feature/match-share-card`, sin
commit todavía — pendiente de que el usuario lo pruebe y autorice mergear a
`dev`.

## 2026-09-16 — Recordatorios de cierre poco fiables: causa confirmada, producción ya arreglada

El usuario reportó que los recordatorios de cierre ("faltan X horas")
casi nunca llegan, y una vez le llegaron 6 de golpe pese a tener todo
activado en preferencias. Investigado leyendo el código (sin tocar
nada): `JobsService.sendClosingReminders` no corre mientras Render está
dormido (plan free) y no tiene recuperación — una ventana de aviso que
pasa dormido se pierde para siempre, así que cuando el servidor por fin
despierta solo llegan los avisos que caen justo en ese instante. Ver
`decisions.md` para el detalle técnico completo.

**Resuelto sin tocar código**: el usuario confirmó que producción ya
está en Render Starter (siempre activo) desde antes de esta sesión —
`roadmap.md` seguía marcándolo "pendiente" por un despiste de registro,
ya corregido. El síntoma que vio es del entorno de dev (plan free a
propósito), y confirmó que ahí no hace falta arreglar nada.

## 2026-09-16 — Pantalla dedicada "Invitar" con el link visible (Sprint 14)

Ajuste sobre el sistema de referidos de la misma sesión, a petición
explícita del usuario ("me gustaria que debajo de normas y premios
salga Invitar y ahi dentro este todo esto del link visible etc"): el
código/link propio solo se podía compartir (share directo desde la
tarjeta de `/profile/level`), sin verse nunca como texto en pantalla.

Nueva pantalla `/profile/invite` (`ProfileInviteComponent`, mismo
patrón visual que `GroupInviteComponent`: tarjeta con el código en
grande, botones "Copiar enlace"/"Compartir", fila con el link completo
y su propio botón de copiar, contador "Has invitado a N amigos" si
`referralCount > 0`) enlazada desde una nueva entrada "Invitar" en
Ajustes del perfil, justo debajo de "Normas y premios". El campo
"¿Alguien te invitó a ti?" (aplicar el código de un amigo) se trasladó
aquí desde el sitio poco visible que tenía antes en la página principal
de Perfil — sigue sin ser un flujo destacado (va después del propio
código, no antes), pero ya no hace falta desplegar nada para verlo.

La tarjeta "Invita a un amigo" de `/profile/level` no cambia: sigue
compartiendo directo al pulsarla (comportamiento ya verificado antes en
esta misma sesión).

Verificado en navegador con las mismas dos cuentas reales de siempre:
código y link visibles correctamente, aplicar el código de otra cuenta
funciona igual que desde el sitio anterior (relación y XP confirmadas
en Postgres, datos de prueba revertidos después). `tsc`/`ng build`
limpios, 17 tests del frontend en verde (sin tests nuevos — cambio de
UI puro, misma lógica ya cubierta en `referrals.service.spec.ts`).

## 2026-09-16 — Sistema de referidos implementado (Sprint 14)

A petición explícita del usuario ("empieza a implementar el tema de la
invitación"), sobre los requisitos que él mismo fijó unas horas antes en
la misma sesión (ver `decisions.md`). Antes de tocar código se cerró con
el usuario el único número que quedaba abierto — cuánta XP da el primer
referido y cómo decae — y de paso el usuario pidió revisar también los
valores de "pleno de jornada", que veía flojos.

**Backend**: `User.referralCode` (único, mismo formato/alfabeto que
`Group.inviteCode`, movido a `common/short-code.util.ts` para
compartirlo) + `User.referredById` (relación permanente, un solo
enlace posible). `ReferralsService` (`GET /users/me/referral`,
`POST /users/me/referral/redeem`) es el único punto de enlace, usado
tanto desde el registro (email y Google — solo cuando la cuenta es
nueva de verdad, no al vincular Google a una ya existente) como desde
el campo manual — mismo resultado por los dos caminos, tal como pidió
el usuario. Bloquea auto-referirse y reasignar un referidor ya fijado.
Migración con backfill (`referralCode` no podía quedar nulo en cuentas
ya existentes) y `XpEvent.groupId` pasa a opcional (REFERRAL no
pertenece a ningún grupo).

**Valores de XP** (`xp.util.ts`, revisados a petición explícita del
usuario en esta misma sesión): primer referido 500 XP, cae a la mitad
en cada uno siguiente hasta un suelo de 10 (`xpForReferral`), sin
límite de cuántas veces se puede usar un código. De paso: pleno de
ganadores (antes `PERFECT_MATCHDAY_1X2`/`PERFECT_MATCHDAY_EXACT`,
130/150) sube a 600 unificado entre modos; nuevo
`PERFECT_MATCHDAY_ALL_EXACT` (1000) para el pleno con el marcador
exacto de *todos* los partidos, no solo el ganador — antes no existía
esta distinción, "pleno" en modo resultado exacto solo exigía acertar
el ganador en todos.

**Frontend**: ruta pública `/r/:code` (`referralLinkGuard`) — sin
sesión guarda el código y manda a `/register`; con sesión lo enlaza al
momento y muestra un toast. La tarjeta "Invita a un amigo" de
`/profile/level` deja de ser un placeholder "Próximamente": comparte
el link real (Web Share/portapapeles, mismo patrón que
`GroupInviteFacade`). Campo "¿Tienes un código de invitación?" en
Ajustes de Perfil, deliberadamente sin card ni icono (a petición
explícita: "debe estar siempre en ajustes o un sitio poco visible").
Botón de info actualizado con los valores reales.

**Verificado de extremo a extremo en navegador** con dos cuentas reales
de desarrollo (`demo-tu@piqo.test`, `leveltest2@piqo.test`): código
copiado de una cuenta, aplicado desde Ajustes en la otra — relación
`referredById` y evento `XpEvent` de 500 XP confirmados directamente en
Postgres; reintentar con un código (incluido el propio) muestra
correctamente "Tu cuenta ya tiene un referidor asignado". Los datos de
prueba se revirtieron después (relación borrada, XP y evento
deshechos) para no dejar sucios los datos de desarrollo. 281 tests del
backend y 17 del frontend en verde, `tsc`/`ng build` limpios en ambos.

Sin implementar todavía (fuera de alcance de esta sesión): el
mecanismo de descuento de Premium en sí (Sprint 11 — el modelo de
datos ya está listo para que lo consulte cuando toque). Sin verificar
en iOS/Android (solo web/local) — en particular, `/r/:code` como
Universal Link depende de que `app-dev.piqo.es`/`app.piqo.es` sirvan el
AASA actualizado (ya editado en el repo, con el nuevo componente
`/r/*`) y de que el build sincronice `apple-app-site-association`.

Rama `feature/referral-system`, no fusionada a `dev` todavía —
pendiente de autorización explícita del usuario para subirla.

## 2026-09-16 — Cloudflare Access delante de `app-dev.piqo.es` (Infraestructura)

Pendiente desde el 2026-09-10 (ver `roadmap.md` § Infraestructura): a
petición explícita del usuario ("pon el cloudflare access"), configurado
usando la extensión de Chrome directamente sobre su cuenta real de
Cloudflare (con permiso explícito para cada paso sensible — se confirmó
antes de aceptar el cargo de $0 de activación del plan).

**Corrección de nombre de dominio**: la documentación de este punto
(`roadmap.md`, `decisions.md`) sigue hablando de `dev.acerton.app`, pero
ese nombre quedó obsoleto tras la migración de dominio a `piqo.es`
(rama `feature/piqo-es-domain-migration`) — el dominio real hoy, y sobre
el que se ha configurado esto, es **`app-dev.piqo.es`** (coincide con
`environment.dev.ts`). Confirmado con el usuario antes de tocar nada.

Hecho:
1. Activado **Cloudflare Zero Trust, plan Free** (hasta 50 usuarios,
   $0/mes — confirmado en la pantalla de facturación antes de aceptar)
   en la cuenta del usuario (`Marc10sagues@gm...`, team name
   auto-generado `summer-mouse-3957`).
2. Creada la aplicación self-hosted **"app-dev"** protegiendo el hostname
   público `app-dev.piqo.es` (dominio `piqo.es`, ya gestionado en esta
   misma cuenta de Cloudflare junto con `acerton.app`).
3. Política de acceso **"Equipo Piqo dev"** (Allow, selector Emails):
   `marc10sagues@gmail.com`, `oriol119@gmail.com`, `support@piqo.es`
   (los tres emails los dio el usuario directamente en el chat, no se
   han guardado en ningún documento del repo). Login por **One-time
   PIN** (código por email, sin configurar un IdP externo). Sesión de
   24 horas.
4. **Verificado en vivo**: abrir `https://app-dev.piqo.es` en una pestaña
   nueva redirige a la pantalla de login de Cloudflare Access
   ("Log in to app-dev") antes de servir nada de la aplicación —
   confirma que el bloqueo funciona de extremo a extremo.

No toca código, DNS, CORS ni el backend — es una capa delante del
hostname, gestionada solo desde el dashboard de Cloudflare. Se puede
desactivar borrando la aplicación en Access → Applications si hiciera
falta.

## 2026-09-16 — Limpieza de `/profile/level` (quitar notificar/tiers/botón duplicado) + planteamiento de referidos (Sprint 14)

Segunda vuelta sobre `/profile/level` en la misma sesión que el punto
anterior, a petición explícita del usuario tras ver la pantalla con datos
reales:

- **Quitado** el botón "Avisarme al desbloquear" de la tarjeta de
  detalle del nivel actual — la preferencia real de "avisarme al subir de
  nivel" ya existe donde debe estar: `/notifications/preferences`
  ("Subida de nivel", `NotificationPreference.levelUp`), no aquí. La
  tarjeta de detalle ya no muestra ningún botón para el nivel en curso
  (solo para un nivel ya conseguido, "Ver en mi perfil"); `claimed`/
  `toggleClaim` eliminados del facade por no tener ya ningún uso real.
- **Quitados** los chips Bronce/Plata/Oro ("Pase de progreso") y la
  palabra de tier en la píldora del héroe (ahora solo "NIVEL 2 DE 18", sin
  "BRONCE ·") — `TIER_NAMES`/`tierIndexOfLevel`/`tierRangeLabel`/
  `LevelTier`/`TierChipView` eliminados de `level-progress.domain.ts` y
  `level-progress.facade.ts` por quedar sin ningún uso.
- **Quitado** el botón duplicado "Cómo ganar XP" de la cabecera de "Tu
  jornada" — ya existe el mismo botón de info arriba a la derecha de la
  pantalla (icono de ayuda), que abre el mismo bottom sheet.

`tsc --noEmit`, `ng build` y los 17 tests del frontend en verde.
Verificado en navegador con la misma cuenta real de desarrollo
(`demo-tu@piqo.test`): pantalla sin aviso de tiers, sin botón de
notificar en el nivel en curso, sin botón de info duplicado; el nivel 1
(ya conseguido) sigue mostrando su "Ver en mi perfil" con normalidad.

**Planteamiento de producto para el sistema de referidos** (todavía sin
implementar, sigue ⬜): a petición del usuario, registrados en
`roadmap.md` (Sprint 14) y `decisions.md` los requisitos que debe cumplir
cuando se construya — código único que sirve tanto de link como para
teclear a mano, entrada por ambos caminos con el mismo resultado, campo
de introducir código siempre en un sitio de baja visibilidad (Ajustes,
no destacado), y modelo de datos pensado para que Sprint 11 (Premium)
pueda aplicar descuentos según el referidor sin rediseñar el sistema.
Sin decidir: formato del código, límites de uso, mecanismo de descuento
(eso es alcance de Sprint 11). No se ha tocado código de esta
funcionalidad todavía — es planteamiento, no implementación.

Rama `feature/level-view-real-stats` (misma que el punto anterior, sin
fusionar todavía) — pendiente de autorización explícita del usuario para
subirla, junto con el resto de cambios de esta sesión sobre esta misma
pantalla.

## 2026-09-16 — Pantalla `/profile/level` al 100% con datos reales (Sprint 14)

A petición explícita del usuario ("revisa la vista de lo del nivel y
complétalo al 100% con datos reales"), sesión fuera de `/quiniela
continuar` (surgió de una revisión de seguridad general) que sí tocaba
este roadmap. Cerraba el hueco que quedaba abierto en la pantalla de
nivel: el aviso "vista de demostración parcial" ya estaba desactualizado
(las recompensas llevaban desde el 2026-09-15 siendo reales), y debajo de
él quedaban tres piezas fijas sin conectar — tarjeta "Tu jornada"
(Aciertos/Racha/Ranking de muestra), "+340 Últimos 7 días" y la tarjeta
"Invita a un amigo" prometiendo "+100 XP" para una función que no existe
todavía (Sistema de referidos, sigue ⬜ en este mismo roadmap).

`ProfileController` (`GET /users/me/profile`) amplía su respuesta con
`xpLast7Days` (suma real de `XpEvent.amount` de los últimos 7 días),
`accuracy` (aciertos/predicciones puntuadas del usuario en todos sus
grupos) y `badgesUnlocked` (insignias distintas conseguidas sobre el
total del catálogo) — sin tocar `globalStreak`, que ya viajaba real en
esta misma respuesta y simplemente no se estaba usando en esta pantalla.
Quitado el aviso de demostración; "Tu jornada" pasa a Aciertos/Racha/
Insignias reales; la tarjeta de invitar deja de prometer una cifra no
decidida y muestra un chip "PRONTO". De paso, corregido en `roadmap.md`
un registro desactualizado: el bottom sheet "Cómo ganar XP" ya tenía los
valores reales de XP desde antes de esta sesión (el roadmap seguía
diciendo "pendiente de actualizar" por un despiste de documentación, no
por código sin hacer).

Ver `roadmap.md` Sprint 14 (filas "Pantalla de progreso de nivel" y
"Botón de info") para el detalle técnico completo.

261 tests del backend en verde (sin tests nuevos — cambio aditivo sobre
`ProfileController`, sin lógica de negocio propia que testear más allá de
consultas Prisma directas), 17 tests del frontend en verde, `tsc --noEmit`
limpio en ambos. Verificado de extremo a extremo en navegador (`ng
serve` + `nest start --watch`, Postgres local) con una cuenta real de
desarrollo con historial (`demo-tu@piqo.test`): 9/21 aciertos, racha x3,
3/20 insignias y +20 XP en los últimos 7 días — los cuatro valores
coinciden exactamente con lo consultado directamente en Postgres antes de
la prueba. Sin verificar iOS/Android (solo web). Rama
`feature/level-view-real-stats`, no fusionada a `dev` todavía — pendiente
de autorización explícita del usuario para subirla.

De paso (no relacionado con el roadmap): revisión de seguridad general
del repo a petición del usuario (secretos en `.env`, SQL injection,
exposición de la base de datos) — sin hallazgos graves; único cambio
aplicado, ya en `dev`: `docker-compose.yml` publicaba Postgres local en
`0.0.0.0:5433` en vez de `127.0.0.1:5433`, corregido y confirmado con el
contenedor recreado.

## 2026-09-15 — El nivel ya no se queda desfasado hasta reiniciar la app (Sprint 14)

A petición del usuario, que probó en local ("hasta que no cierro la app
y la vuelvo a abrir no se me desbloquea la mascota... el punto sigue sin
salir"): séptimo incremento del Sprint 14 el mismo día, y causa raíz real
de por qué el puntito del incremento anterior "no salía" en su prueba.

`AuthService.currentUser()` (de donde sale el nivel del badge del avatar
en top-bar/Perfil y el gating de `/profile/avatar`) solo se actualizaba
en el arranque de la app o tras una acción explícita (login, guardar
avatar) — nunca solo porque la XP subiera en el backend. Con la app
abierta, pronosticar un partido que cruzaba de nivel dejaba el nivel
real ya correcto en el servidor, pero el frontend seguía usando el nivel
viejo hasta cerrar y reabrir la app: la recompensa nueva seguía
apareciendo bloqueada, y al estarlo, su puntito rojo tampoco podía salir
(depende de que ya esté desbloqueada).

Nuevo `AuthService.refreshCurrentUser()` llamado desde `ShellFacade` en
el mismo punto donde ya se detecta la subida de nivel en vivo (el
`effect` que abre el pop-up) — el nivel se refresca exactamente cuando
hace falta, sin tocar ningún otro flujo.

tsc y 17 tests del frontend en verde. Verificado en navegador sin
recargar la página en ningún momento: pop-up → badge del avatar pasa a
mostrar "2" al instante → la mascota de esa recompensa aparece
desbloqueada con su puntito rojo, todo en la misma sesión. Mergeado a
`dev` y empujado a `origin/dev`; pendiente lanzar un build nuevo de
TestFlight, ya que el que el usuario tenía instalado era anterior tanto
a esto como al incremento del puntito rojo en sí.

## 2026-09-15 — Puntito rojo en el propio color/mascota recién desbloqueado (Sprint 14)

A petición del usuario ("solo falta que cuando tengas un elemento nuevo
ese elemento se marque con el puntito rojo"): sexto incremento del
Sprint 14 el mismo día. El puntito rojo de "recompensa sin reclamar" ya
existía en 3 sitios (pestaña Perfil, nodo del recorrido, tarjeta de
detalle) pero no en el elemento en sí dentro de `/profile/avatar` — al
entrar ahí tras subir de nivel, el color/mascota nuevo se veía igual que
cualquier otro ya desbloqueado antes.

`ProfileAvatarFacade.isMascotNew`/`isBackgroundNew` comparan el nivel
requerido de cada color/mascota (mismo mapeo que el gating de
`avatar-level-rewards`) contra `NotificationsFeedService.
unreadLevelUps()` — mismo dato que ya alimentaba los otros 3 puntitos,
sin campo nuevo. El punto se apaga solo junto con el resto al marcar
leído el aviso (pulsándolo desde Avisos o desde el recorrido), no antes
— verlo en el picker sin haber pulsado la notificación no lo da por
reclamado, mismo criterio que el resto de puntitos "pendiente" de la
app (p.ej. Jornada, que tampoco se apaga solo con abrir la pestaña).

tsc y 17 tests del frontend en verde. Verificado en navegador con una
cuenta real (subida de nivel 1→2 forzada para la prueba): "Mascota
saludo" aparece con el puntito nada más desbloquearse, y desaparece a
la vez en los 4 sitios al pulsar la notificación de subida de nivel.
Mergeado a `dev` y empujado a `origin/dev`.

## 2026-09-15 — XP de participar en tiempo real al pronosticar, no solo al cerrar la jornada (Sprint 14)

A petición del usuario, que probó en `dev` y vio que la barra de nivel
no se movía al pronosticar ("en dev aunque ponga predicciones no sube
nada la barra de nivel"), y tras aclarar el comportamiento esperado
("solo al seleccionar un partido ya debe subir un poco, si cambias el
valor no, pero si no has participado y participas a un partido debe
funcionar"): quinto incremento del Sprint 14 el mismo día.

Hasta ahora la XP de "participar" (+5) era un flat por jornada, y solo
se concedía cuando la jornada cerraba de verdad (mismo punto que
insignias/rachas — necesita resultados reales sincronizados del
proveedor de partidos, `JobsService.finalizeMatchday`). En `dev`, sin
partidos reales terminados todavía, eso significaba que nada de XP se
veía nunca, aunque el usuario sí estuviera pronosticando. Se movió esta
fuente concreta a tiempo real: `XpService.awardParticipation` concede
+5 XP al momento desde `PredictionsService.submit`, comprobando antes
del `upsert` si ya existía pronóstico para ese partido/usuario/grupo —
solo la primera vez cuenta, cambiar después el pronóstico no vuelve a
dar XP. El resto de fuentes (aciertos, pleno de jornada) sigue
dependiendo del cierre real, sin cambios.

Si esa XP cruza de nivel, se dispara la misma notificación `LEVEL_UP`
que ya existía (pop-up en vivo si estás en la app). `current-matchday.
facade.ts` refresca el feed de avisos justo tras guardar un pronóstico
para que el pop-up salte al instante en vez de esperar el polling de 2
min de `ShellFacade`.

11 tests nuevos/actualizados (261 tests del backend en verde), tsc y 17
tests del frontend en verde. Verificado en navegador con una cuenta real
de nivel 1: pronosticar un partido nuevo sube la barra de 0/200 a 5/200
al instante; cambiar después ese mismo pronóstico (1 → X) no vuelve a
sumar XP. Mergeado a `dev` y empujado a `origin/dev`.

## 2026-09-15 — Gating real de colores/mascotas por nivel + recorrido muestra la recompensa atenuada (Sprint 14)

A petición del usuario, que probó la pantalla en local con una cuenta de
nivel 1 ("porque puedo usar los elementos" + "en el timeline... debería
salir un círculo con la imagen o el color pero que se vea que no lo has
desbloqueado"), cuarto incremento del Sprint 14 el mismo día. Cierra el
hueco que quedó anotado explícitamente al terminar el incremento
anterior (ver entrada de abajo y `roadmap.md`).

Dos cambios: (1) `UsersService.updateAvatar` ahora valida en servidor
que el nivel del usuario alcance el que pide `avatar-level-rewards.ts`
(nuevo, mismo mapeo que `LEVEL_REWARDS` del frontend) antes de guardar
un color/mascota de premio — 403 si no llega, igual de real que ya lo es
el nivel (`User.experience`) desde el primer incremento; a diferencia de
las mascotas de trofeo, que siguen sin comprobación real en servidor
porque los trofeos todavía no son un dato real. `/profile/avatar` ya no
deja pulsar un elemento bloqueado (mismo candado/atenuado que ya tenían
las mascotas de trofeo, extendido también a los colores, que antes no
tenían ningún bloqueo visual). (2) En `/profile/level`, los nodos
bloqueados del recorrido ya no esconden la recompensa detrás de un
candado genérico — muestran el color/mascota real en gris/atenuado con
un candado pequeño superpuesto encima, para poder ver qué se gana en
cada nivel sin haberlo desbloqueado todavía.

7 tests nuevos/actualizados en `users.service.spec.ts` (253 tests del
backend en verde), `tsc`/17 tests del frontend en verde. Verificado en
navegador con una cuenta real de nivel 1: clic en mascota/color
bloqueado no cambia nada, y el recorrido muestra "Mascota saludo ·
BLOQUEADO · Faltan 1 niveles" con su miniatura atenuada. Mergeado a
`dev` y empujado a `origin/dev`.

## 2026-09-15 — Catálogo de recompensas real, aviso de subida de nivel y pop-up en vivo (Sprint 14)

A petición explícita del usuario ("añade según tu criterio los elementos
desbloqueables... y si estás conectado en la app cuando subes de nivel
debe aparecer un pop up... si no estás en la app tendrás la opción desde
notificaciones push..."), tercer incremento del Sprint 14 sobre el
backend real de XP/nivel del mismo día. Ver `roadmap.md` Sprint 14 para
el detalle técnico completo (tabla actualizada con 4 filas nuevas/
cambiadas).

Resumen: `LEVEL_REWARDS` pasó de catálogo de muestra a 18 recompensas
reales (colores/mascotas del catálogo cerrado de avatares, diseño y
orden a criterio de Claude Code, tal como pidió el usuario). Nuevo tipo
de notificación `LEVEL_UP` (push + fila in-app), disparado justo después
de que `XpService.evaluateAfterMatchdayClose` (ahora devuelve qué
usuarios subieron de nivel en esa pasada) corre en el cierre de jornada.
Con la app abierta, un polling de 2 min en `ShellFacade` detecta el
aviso sin leer y abre un pop-up una sola vez por sesión; puntito rojo
replicado (mismo patrón que Jornada) en la pestaña Perfil, el nodo del
recorrido y la tarjeta de detalle. Primera vez que existe marcar un
aviso como leído individualmente (`markOneRead`), usado al pulsar la
notificación/recompensa para navegar a `/profile/avatar` y apagar su
puntito rojo.

**Sigue sin implementar** (no pedido en este incremento): el gating real
en `/profile/avatar` que impida elegir un color/mascota de un nivel
todavía no alcanzado — el catálogo de ahí sigue abierto para cualquier
cuenta, ver fila "Desbloqueables" en `roadmap.md`.

250 tests del backend en verde, `tsc --noEmit` limpio, 17 tests unitarios
del frontend en verde. Verificado de extremo a extremo en navegador
insertando una fila `Notification` de prueba directamente en Postgres
(borrada después): pop-up en vivo, puntito rojo en los 4 sitios, y clic
→ navegación + desaparición del puntito. Corregido en el camino un
`NG0600` (escritura de señal dentro de un `effect` sin
`allowSignalWrites: true`). Sin verificar iOS/Android ni la entrega real
del push (requiere dispositivo). Mergeado a `dev` y empujado a
`origin/dev`.

## 2026-09-15 — Backend real de XP/nivel (Sprint 14) + insignia de nivel en avatares

A petición del usuario ("añade el nivel en todos los sitios donde sale
la foto de perfil de un usuario" → "implementamos back[end]"): el
sistema de nivel/experiencia deja de ser una pantalla de muestra y pasa
a tener backend real. Ver `roadmap.md` Sprint 14 para el detalle técnico
completo (valores de XP por fuente, curva de nivel, qué falta —
referidos, XP por entrar cada día, desbloqueables reales).

Resumen: `User.experience` + `XpEvent` (log), `XpService` enganchado al
mismo punto que `BadgesService` (`JobsService.finalizeMatchday`). El
nivel se expone en `toPublicUser` (cubre login/registro/verify-email/
Google/`users/me` de golpe) y en los endpoints que ya devolvían el
avatar de otros usuarios (miembros de grupo, Tabla, resultados de
jornada, detalle de miembro) — sin round-trips nuevos. 275 tests del
backend en verde (15 nuevos).

`AvatarComponent` gana un `[level]` opcional (insignia circular abajo-
derecha) conectado en los 9 sitios que ya usaban `app-avatar`. La
pantalla `/profile/level` (diseñada en Claude Design, ver Sprint 14) y
la tarjeta mini de Perfil pasan de datos fijos a `/users/me/profile`
real — las recompensas del pase (colores, mascotas) siguen siendo
catálogo de muestra, aviso actualizado en la pantalla para reflejarlo.

Verificado en navegador con una cuenta nueva (nivel 1, 0/200 XP) en
top-bar, Perfil, Tabla y la pantalla de nivel completa.

## 2026-09-15 — Feed real de avisos (issue #21) + campanita restaurada

A petición del usuario ("podemos crear ya la vista de notificaciones?"),
terminado el issue #21: la pantalla "Avisos" (`/notifications`) dejó de
ser una lista de muestra (`DEMO_NOTICES`) y pasó a mostrar el historial
real de avisos del usuario — logros/insignias conseguidas, puntos
ganados en una jornada terminada, recordatorios de cierre, reenganche.
Ver `roadmap.md` Sprint 9 para el detalle técnico completo.

Nuevo modelo `Notification` en Prisma: se crea una fila cada vez que
`NotificationsService` decide enviar el push equivalente (mismos filtros
de preferencia/silencio ya aplicados), así que el feed nunca puede
desincronizarse de a quién le llega el push real. Nuevos endpoints
`GET /notifications/me` y `POST /notifications/me/read-all`. En el
frontend, `NotificationsFeedService` ya no lee `DEMO_NOTICES`, sino la
API real; se restauró la campanita del top-bar (escondida a propósito
desde el 2026-09-12, con un comentario explícito señalando este mismo
issue) con su contador real de avisos sin leer.

6 tests unitarios nuevos (231 en el backend en verde), y verificado en
navegador insertando avisos con la forma exacta que generaría el
backend: iconos por tipo, agrupación Hoy/Esta semana/Anterior, tiempo
relativo, contador "3" en la campanita, y "Leer todo" confirmado con SQL
directo (no solo optimista en el cliente) que persiste tras recargar.
Sin verificar iOS/Android.

## 2026-09-15 — Catálogo de insignias ampliado a 20 (dos pasadas en la misma sesión)

A petición directa del usuario ("5 me parecen pocas", y después "deberíamos
tener hasta 20"), el catálogo de insignias pasó de 5 a 20. Ver `roadmap.md`
Sprint 8 para el detalle completo de condiciones y verificación.

**Primera pasada** (6 insignias, completando 11 de las 12 propuestas en
`product-rules.md`): Incombustible (25 jornadas seguidas), Centenario (100
pronósticos), Buen ojo/Experto en 1X2 (25/100 aciertos 1X2, solo grupos
modo 1X2), Al milímetro/Francotirador (1/10 marcadores exactos acertados
— no solo el ganador —, solo grupos resultado exacto).

**Segunda pasada** (9 insignias más, ya no del catálogo de
`product-rules.md` — no propone más de 12 —, sino ideadas sobre mecánicas
ya existentes de la app): Racha de fuego (10 aciertos seguidos), Leyenda
(500 pronósticos), Pleno (todos los partidos de una jornada con puntos),
Comodín de oro (el comodín de remontada dio puntos 5 veces — mismo
criterio que `rescueHits` del frontend), Sociable (3 grupos a la vez),
Especialista en empates (10 empates acertados), Multiliga (3 ligas
distintas), Fundador (crear un grupo — única que se concede al momento,
en `GroupsService.create()`, no al cerrar una jornada), En el podio
(top-3 semanal 5 veces).

Sin tocar las 5 que ya existían (ni su nombre ni su condición) — la
renombrada pendiente "Jornada perfecta"→"En lo más alto" (ver
`backlog.md`) sigue abierta, no se ha decidido en esta sesión.

Queda pendiente solo "Campeón" (primer premio de temporada, la única de
las 12 originales de `product-rules.md` sin implementar): no hay
condición real que evaluar todavía porque depende de temporada cerrada +
modelo de trofeos (Sprint 6, sigue 🔒 sin modelo de datos) — no se ha
inventado una aproximación sustituta para no comprometer el criterio
cuando el Sprint 6 exista de verdad.

Ninguna de las 15 nuevas tiene arte 3D propio (el HANDOFF fijaba los 5
motivos originales como cerrados) — usan el fallback genérico ya
existente en la UI (medalla conseguida/candado pendiente). Si se quiere
arte propio para ellas, es trabajo de diseño aparte, no de esta sesión.
Sociable/Multiliga/En el podio son condiciones de cuenta (no de un grupo
concreto) pero se conceden ancladas al grupo que disparó la comprobación
— no hay insignia "sin grupo" hoy (el alcance global sigue 🔒 bloqueado
por la deduplicación pendiente, ver ese mismo Sprint 8 más abajo).

Backend: 31 tests unitarios nuevos (21 en `badges.service.spec.ts`, 1 en
`groups.service.spec.ts` para Fundador; los otros 9 son ajustes a tests ya
existentes que se vieron afectados por compartir mocks de
`prisma.prediction.findMany`/`count` con las nuevas consultas) — los 229
tests del backend en verde. Verificado en navegador y en base de datos
real de desarrollo: progreso mostrado coincide con los pronósticos reales
ya enviados, y "Fundador" se concedió de verdad al crear un grupo de
prueba (borrado después). Sin verificar iOS/Android.

## 2026-09-14 — Canvas compartible de resultados de jornada

Añadido debajo de **Copiar resumen** en la pantalla `Enviado` de Jornada
un botón **Compartir imagen**; la vista cerrada `matchday-results` también
tiene su propia entrada **Compartir**. Abre una vista previa de marca en
formato cuadrado 1080×1080 con jugador, grupo, competición, puntos,
aciertos, puesto, racha y hasta diez partidos del desglose. El PNG usa
siempre la paleta oscura/champán de Piqo 4.1 para que no dependa del tema
del dispositivo. Desde la vista previa, **Compartir imagen** abre el panel
nativo/Web Share cuando admite archivos (con descarga directa del PNG como
fallback si el navegador no soporta Web Share); **Copiar** copia la imagen
al portapapeles (Clipboard API) para pegarla directo en otra app o chat —
se sustituyó el botón inicial de "Descargar PNG" por este, ya que
descargar la imagen ya es posible desde "Compartir imagen". Sin cambios de
backend.

Se corrigió además un bug de imagen en negro: `CanvasRenderingContext2D.
roundRect` no existe en WebKit anterior a iOS 16.4, y el mínimo soportado
por la app es iOS 15 (`IPHONEOS_DEPLOYMENT_TARGET`) — la llamada lanzaba
una excepción a mitad del dibujado y dejaba solo el `fillRect` de fondo
pintado. Se reemplazó por un trazado manual del contorno con `arcTo`,
compatible con todas las versiones de WebKit soportadas, y se envolvió
`open()` en try/catch/finally para que un fallo de dibujado muestre un
toast en vez de dejar el diálogo colgado en "generando" para siempre.

Verificado en navegador (`ng serve`) con sesión real: la variante `picks`
(Jornada → Enviado → Compartir imagen) se probó de extremo a extremo y
genera el canvas correctamente. La variante `results` (matchday-results →
Compartir) se verificó por revisión de código — comparte exactamente las
mismas rutinas de dibujo ya probadas (`roundRect`, `text`, `predictionRow`)
sin APIs adicionales — porque los datos locales de seed no incluyen
ninguna jornada finalizada con puntos reales para abrir esa pantalla.

_A partir de ahora (2026-09-14, instrucción explícita del usuario): todas
las builds se lanzan contra `dev`, nunca `main`. `dev` no se mergea a
`main` sin confirmación explícita, y la build de `main` es un paso
aparte, posterior y también explícito. Al fijar esta regla, `dev` llevaba
53 commits de retraso respecto a `main` — con autorización del usuario se
puso `dev` al día (fast-forward a `main`) antes de mergear encima el
primer incremento bajo la regla nueva._

## 2026-09-14 — Reactivar el comodín de remontada (issue #22 casi completo)

Rama `feature/comeback-unhide` (a partir de `feature/group-invite-preview`,
sin mergear ninguna de las dos a `dev` todavía). A petición explícita del
usuario ("añade todo lo que escondimos de remontada"), deshecho todo lo
marcado "Próximamente"/escondido desde `4b71858` y `569d655`:

- `group-detail` (Ajustes del grupo): el toggle "Comodín de remontada"
  vuelve a ser real (`toggleComebackEnabled` dejó de ser un no-op) y
  "Puntos por opción doble" ahora tiene un botón de editar (icono lápiz)
  que revela un input numérico — se guarda junto con el resto de cambios
  pendientes en el único botón "Guardar cambios" ya existente (se
  reintrodujo `editingRules`/`comebackPointsPerBonusInput`/
  `hasRuleChanges`, integrados en `hasAnyChanges`, tal como estaban antes
  de quitarse en `43e985c` — la diferencia esta vez es que el toggle y el
  guardado son reales, no un input permanentemente disabled).
- `group-create`: vuelve el enlace "¿Cómo funciona el comodín?" y la
  mención al comodín en la descripción del modo 1X2.
- `group-explore` (listado y vista previa de grupos públicos): vuelve el
  chip "Remontada activa" y la línea de reglas con
  `comebackPointsPerBonus`.

Backend: sin cambios — `UpdateGroupRulesDto`/`GroupsService.updateRules`
ya soportaban `comebackPointsPerBonus` de antes, solo estaba sin
conectar en la UI.

Sin verificar todavía en dispositivo real — solo en local
(`ng serve`+`nest start:dev` contra Postgres de Docker). Pendiente:
decidir si esto se mergea a `dev` y se lanza build.

## 2026-09-14 — Vista previa al unirse por link o código (sin issue de GitHub)

Rama `feature/group-invite-preview` (a partir de `dev`). A petición
explícita del usuario ("cuando te unes a un grupo mediante link o codigo
de invitacion deberia darte un preview del grupo y tu decides si te unes
o cancelas"): antes, tanto abrir un link de invitación
(`/groups/join/:inviteCode`, `GroupJoinComponent`) como introducir un
código a mano (`/groups/join-code`) unían al usuario al instante, sin
ninguna confirmación. Ahora ambos caminos llevan a la misma pantalla de
vista previa (mismo componente, ya no une automáticamente al entrar): el
código de código manual ahora navega a `/groups/join/:inviteCode` en vez
de llamar a unirse directamente.

Backend nuevo: `GroupsService.findGroupByInviteCode` (igual que
`findPublicGroupById` pero por código y sin exigir `isPublic`, porque
tener el código ya autoriza a verlo) y
`PublicGroupPreviewService.getPreviewByInviteCode`, que comparte con
`getPreview` toda la lógica de construir la vista previa (reglas reales,
ligas, top 5 de clasificación) via un `buildPreview` privado extraído.
Endpoint nuevo `GET /groups/join/:inviteCode/preview`
(`GroupInvitePreviewController`, mismo módulo hoja que
`PublicGroupPreviewController` para no crear el ciclo de módulos ya
documentado en ese servicio). Tests unitarios nuevos para el caso de
código inválido, grupo privado por código, y `isMember` ya perteneciendo.

Si el usuario ya es miembro (reabre un link viejo), la pantalla muestra
"Ir al grupo" en vez de "Unirme"/"Cancelar". Sin verificar todavía en
dispositivo real — pendiente de build de `dev`.

## 2026-09-14 — Comodín de remontada: nuevo gesto en Jornada (issue #22)

Rama `feature/comodin-remontada-longpress` (a partir de `main`, ya
mergeada a `dev`). Retomado el issue #22 solo en la parte de interacción: el botón cuadrado
que iba pegado a las opciones 1/X/2 (escondido desde `4b71858`, ver
Reconciliación 2026-09-12 más abajo) no vuelve tal cual — a petición
explícita del usuario ("no me gusta el diseño... sale un botón más"), ahora
mantener pulsada la fila de un partido abre un panel inferior
(`ComebackSheetComponent`) con las tres combinaciones (1X/X2/12), el nº de
comodines restantes y, si el partido ya tenía uno activo, un botón "Quitar
comodín". La fila de 1/X/2 queda visualmente intacta, sin ningún botón
extra. Añadido también un aviso de una línea bajo la cabecera ("Tienes N
comodines de remontada esta jornada. Mantén pulsado un partido para
usarlo.") solo cuando quedan usos disponibles, a modo de indicador de
cuántos quedan y pista de cómo activarlo.

Sin verificar en dispositivo real todavía (pendiente de build de `dev` +
TestFlight). Sigue sin tocarse el resto del issue #22: activar/ajustar en
`group-create`, Ajustes del grupo, "Normas y premios", y si la lógica de
recálculo de usos por diferencia de puntos con el líder se comporta como
se espera con datos reales — nada de eso se ha revisado en este
incremento, así que el issue no se cierra todavía.

_Última actualización: 2026-09-12. Sprint 3 y Sprint 4 completos en `dev`,
Sprint 5 con sus tres primeros incrementos (base de temporadas,
elegibilidad, racha global) en `dev` — **todavía pendiente de que el
usuario los pruebe antes de mergear a `main`** (sin cambios en este punto
desde el 2026-09-10). Entretanto, una sesión de rediseño visual
("Piqo Mobile 4.0" → "Piqo App 4.1", fuera del alcance de esta skill) ha
seguido subiendo commits directos a `dev`; ver más abajo la reconciliación
de lo que, de paso, sí tocaba reglas de producto de este roadmap._

## Sprint activo

**Sprint 1 y 2**: cerrados, mergeados a `main`, confirmados en producción.

**Sprint 3 — Roles y membresías**: completo en `dev`, verificado (17
comprobaciones de permisos por HTTP directo + navegador con dos sesiones
reales). Ver `roadmap.md` Sprint 3. Issue #8 en Status "Test".

**Sprint 4 — Tutorial**: completo en `dev`, verificado en web. Ver
`roadmap.md` Sprint 4. Issue #9 en Status "Test". Nota: una sesión de
rediseño visual posterior corrigió un bug real no relacionado con el
roadmap (`TutorialService.start()` no marcaba `tutorialCompletedAt` hasta
terminar el recorrido completo, así que si el usuario navegaba fuera a
mitad del tutorial volvía a aparecer en la siguiente jornada/grupo) — ahora
se marca "visto" en cuanto arranca. Refuerza la fila ya ✅ "No reaparece en
cada grupo", no añade una tarea nueva.

**Sprint 5 — Temporadas, estadísticas y rachas**: **en curso**, primer
incremento (base de temporada), segundo (elegibilidad) y tercero (racha
global) completos en `dev`. Ver `roadmap.md` Sprint 5 para el detalle
exacto. Issue #10 actualizado con las casillas hechas, **sigue en Status
"New features"** (el sprint no está completo).

**Orden estable de jornadas por cierre de pronósticos**: implementado en
dos vueltas 2026-09-19 (ver entrada de arriba y `decisions.md`) — la
primera (PR #33) ya en `dev`, la segunda (fix real basado en el próximo
partido sin terminar, rama `fix/matchday-reference-order-by-next-kickoff`)
con PR pendiente de abrir. Sin verificar en navegador todavía. Pendiente
del mismo sprint, en incrementos siguientes: estadísticas agregadas por
temporada (sin tocar desde el 2026-09-10).

Sin verificar en Sprint 3/4/5: iOS/Android (solo web).

**Sprint 9 — Notificaciones**: **en curso**, primer incremento completo,
mergeado a `dev` y empujado a `origin/dev` (con autorización explícita del
usuario). Ver `roadmap.md` Sprint 9 para el detalle exacto. Issue #14
actualizado con las casillas hechas (7 de 12), **sigue en Status "New
features"** (el sprint no está completo).

Pendiente del mismo sprint, en incrementos siguientes: aviso de apertura
de jornada (necesita un disparador nuevo — hoy no existe ningún evento de
"jornada abierta" que un cron pueda detectar, ver `roadmap.md`), aviso de
partido individual terminado con puntos, agrupar el mismo partido jugado
en varios grupos en un solo aviso, aviso de temporada/trofeos (bloqueado
por Sprints 5-6), y la comprobación de regularidad del hosting.

**Bug 2026-09-13 (push nunca llegaba en iPhone), commit `9bc1952` en
`fix/ios-push-notifications`**: diagnosticado y corregido en código
(`App.entitlements`, `AppDelegate.swift`, `FcmTokenPlugin.swift` nuevo,
`push-notifications.service.ts`) — ver `decisions.md` para el detalle
técnico completo. El build de esta app se hace por GitHub Action
(`.github/workflows/ios-build.yml`, sin Xcode interactivo), así que
también se cableó `project.pbxproj` a mano (Firebase SDK como paquete
remoto, nuevos archivos en Sources/Resources) para que la Action compile
esto de verdad — nada queda pendiente "hazlo en Xcode". Además, ya hecho
desde el navegador (con el usuario): app iOS registrada en Firebase
(`acerton-39f07`, bundle id `app.piqo.es`) con su
`GoogleService-Info.plist` ya copiado al repo, clave de autenticación
APNs creada en Apple Developer y subida a Firebase Cloud Messaging
(desarrollo y producción), capacidad "Push Notifications" del App ID y
del perfil "Piqo" verificadas (ya estaban activas), y refrescado por si
acaso el secreto `IOS_PROVISIONING_PROFILE_BASE64` de la Action. **Sin
compilar ni probar en dispositivo real** (sin Mac/Xcode en esta sesión) —
siguiente paso: lanzar la Action a mano y probar el `.ipa`/TestFlight
resultante en un iPhone real — ver `backlog.md` para el detalle.

**Sprint 7 — Perfil y avatares**: **en curso**, primer incremento de
avatares (catálogo de mascota + color, asignación automática al
registrarse) completo en la rama `feature/sprint-7-avatares` (creada a
partir de `dev`, **no fusionada a `dev` todavía** — pendiente de
autorización explícita del usuario para subirla). El usuario aportó las
13 imágenes de la mascota "Piqo" y pidió también color de fondo
elegible + subir foto propia; la parte de foto propia queda bloqueada
por una decisión de almacenamiento de imágenes sin tomar (ver
`backlog.md`). Ver `roadmap.md` Sprint 7 para el detalle exacto. Issue
#12 actualizado con las casillas hechas (4 de 8), **sigue en Status "New
features"**.

**Infraestructura — entorno dev/pre**: sin cambios desde el cierre
anterior (ver `roadmap.md` para el plan completo) — `dev.acerton.app`
funcionando, pendiente subir producción a Render Starter y Cloudflare
Access. Issue #16.

## Reconciliación 2026-09-12 (trabajo ajeno a esta skill que sí tocaba el roadmap)

Entre el 2026-09-10 y hoy hubo una sesión larga de rediseño visual del
frontend (commits `bc62782`…`6379286`, "Piqo Mobile 4.0"/"Piqo App 4.1")
que **no se hizo bajo `/quiniela continuar`** y es, en su inmensa mayoría,
una reconstrucción puramente de presentación (tokens de diseño,
gradientes, animaciones, reestructuración de pantallas) sin relación con
`product-rules.md`. No se ha registrado sprint por sprint porque no lo es.

Al comprobar el código contra el roadmap (siguiendo el punto 2 del
protocolo de `/quiniela continuar`: "no asumir que el estado coincide con
lo anotado"), dos piezas de ese trabajo sí resuelven tareas reales de
sprints bloqueados en "falta este detalle":

- **Sprint 7 — "Nombre bloqueado 7 días"**: pasó de 🟡 a ✅ web. El input
  de nombre ya no se oculta cuando no se puede cambiar — se muestra
  `[disabled]` con el nombre actual dentro, más el hint de fecha debajo.
  Ver `roadmap.md` Sprint 7 y issue #12 (casilla marcada).
- **Sprint 8 — "Popup con descripción y % de usuarios que la tienen"**:
  pasó de ⬜ a ✅ web. `GET /badges/stats` (nuevo, `BadgesService.
  getEarnStats`) calcula el % sobre el total de usuarios registrados,
  deduplicado por usuario (no cuenta dos veces a quien ganó la insignia en
  varios grupos); `BadgeDetailDialogComponent` lo muestra junto a la
  descripción y el estado conseguida/pendiente. Ver `roadmap.md` Sprint 8
  e issue #13 (casilla marcada).

Ninguno de los dos sprints queda completo con esto — quedan más tareas
pendientes en ambos (ver `roadmap.md`) — así que ninguno de los dos issues
cambia de columna en el Project (siguen en "New features").

**Todo lo demás de esa sesión de rediseño** (sistema visual Piqo 4.1,
reconstrucción de Avisos/Histórico de jornadas/Normas y premios,
insignias/trofeos como vitrina visual — los "años" y el "resumen de
temporada" de un trofeo son datos de muestra explícitos, no implementan el
Sprint 6 real, que sigue 🔒 sin modelo de datos —, toggles de Ajustes de
grupo, icono de cabecera en Unirse a un grupo, página de error de
muestra) es presentación pura sin relación con ninguna tarea de
`product-rules.md`/`roadmap.md` — no se ha tocado nada más en los
documentos por esto.

## Último trabajo verificado

- Sprint 3: migración de schema (`ownerId`, `deletedAt` con backfill), 5
  endpoints nuevos (leave/kick/role/transfer/delete), 17 comprobaciones de
  permisos por HTTP directo, flujo completo de UI con dos sesiones de
  navegador reales.
- Sprint 4: `TutorialService` + `TutorialCoachMarkComponent`, persistido
  por cuenta. Reforzado 2026-09-12 (ver reconciliación arriba).
- Sprint 5 (incremento 1): `GroupSeason` + `Competition.seasonEndPreviewAt`
  + `SeasonsService` (preview, cierre real, 9 tests) + etiqueta de
  temporada en Tabla.
- Sprint 5 (incremento 2): `EligibilityService` (50% inclusive, exclusión
  por fecha de incorporación, deduplicación por jornada) + endpoint, 8
  tests unitarios + verificado en vivo.
- Sprint 5 (incremento 3): racha global (`GlobalStreak`,
  `updateGlobalStreaks`/`getGlobalForUser`), 4 tests unitarios +
  verificado en vivo en Perfil (navegador).
- Sprint 7: nombre bloqueado con input deshabilitado visible (2026-09-12,
  ver reconciliación).
- Sprint 8: popup de insignia con % real de usuarios (2026-09-12, ver
  reconciliación). Ampliado el mismo día (a petición explícita del
  usuario): progreso numérico + barra para las insignias medibles
  (`GET /badges/me/progress`, mismo umbral que la concesión real vía
  `BADGE_TARGETS` para que nunca se desincronicen), en la pantalla de
  Insignias y en el popup de detalle. 4 tests unitarios + verificado en
  vivo contra la base de datos real de desarrollo (racha real de 3
  mostrando 3/5 y 3/10) y en navegador.
- Sprint 9 (incremento 1, 2026-09-12): `NotificationPreference` +
  `GroupMembership.mutedNotifications` (migración aplicada y probada
  contra la base de datos real de desarrollo), pantalla `/notifications/
  preferences`, recordatorios de cierre con 4 franjas independientes,
  jornada terminada con posición real, insignia conseguida. 10 tests
  unitarios nuevos/actualizados (`notifications.service.spec.ts`,
  `jobs.service.spec.ts`) + verificado en navegador real (cuenta nueva:
  toggle, recarga, mute de grupo). Sin verificar entrega real de push
  (requiere Firebase configurado + dispositivo). Mergeado a `dev` y
  empujado a `origin/dev`.
- Sprint 7 (incremento 1 de avatares, 2026-09-12): catálogo cerrado de 13
  mascotas + 8 colores de fondo (`User.avatarBackground`, migración
  aplicada), `GET /users/me/avatar-catalog` + `PATCH /users/me/avatar`
  con validación de catálogo cerrado en servidor, asignación aleatoria al
  registrarse (`AuthService.register`), pantalla `/profile/avatar`,
  componente compartido `app-avatar` (foto/mascota+color o iniciales)
  usado en top-bar y Perfil. 1 test unitario nuevo
  (`users.service.spec.ts`) + verificado en navegador real (cuenta nueva:
  selección, guardado, persistencia) y por API directa (registro con
  asignación automática, rechazo de `mascotId`/`background` fuera del
  catálogo). Subida de foto propia explícitamente bloqueada (ver
  `backlog.md`). Rama `feature/sprint-7-avatares`, no fusionada a `dev`
  todavía.

## Siguiente paso concreto

**Inmediato, del usuario**: tres decisiones pendientes, independientes
entre sí:

1. Sigue pendiente desde el 2026-09-10 — probar Sprint 3, Sprint 4 y los
   incrementos 1-3 del Sprint 5 (temporadas, elegibilidad, racha global)
   en local o en `dev.acerton.app`, y confirmar si se mergea a `main`.
   Todo sigue en `dev`, empujado a `origin/dev`, **no mergeado a `main`
   todavía**. Los issues #8 y #9 ya están en Status "Test"; el #10
   (Sprint 5) se queda en "New features" hasta que el sprint entero esté
   completo.
2. Confirmar si se sube el incremento 1 de avatares del Sprint 7
   (`feature/sprint-7-avatares`) a `dev` para poder probarlo ahí (dispara
   la regla de "Seguimiento en GitHub": marcar el Project cuando se suba,
   aunque el issue #12 seguirá en "New features" porque el sprint no
   queda completo con este incremento).
3. Decidir proveedor de almacenamiento de imágenes (coste, cuenta,
   credenciales) para poder implementar "subir foto propia" del Sprint 7
   — sin esto, esa tarea y las que dependen de ella (sustituir foto,
   validar/limpiar metadatos) no se pueden empezar. Ver `backlog.md`.

Después: siguientes incrementos del Sprint 5 (orden estable de jornadas,
estadísticas agregadas), resto de tareas del Sprint 8 (alcance global de
insignias, catálogo ampliado, favoritas, progreso numérico), siguientes
incrementos del Sprint 9 (apertura de jornada, partido individual
terminado, agrupar avisos entre grupos), o el resto del Sprint 7 (perfil
ajeno, historial entre dos usuarios) — ver `roadmap.md` para el detalle
de cada uno.

## Bloqueos y preguntas pendientes

Ver `backlog.md`. Nuevo desde el 2026-09-12: proveedor de almacenamiento
de imágenes para la subida de foto propia del Sprint 7 (sin resolver, no
bloquea nada más — el resto del sprint sigue avanzando).

## Cambios sin commit

No en `dev`: el incremento 1 de avatares del Sprint 7 está commiteado y
empujado a `origin/feature/sprint-7-avatares`, una rama aparte que
**todavía no se ha fusionado a `dev`** (pendiente de autorización
explícita). El incremento 4 del Sprint 5 ("orden estable de jornadas",
primera vuelta, PR #33) ya está en `dev`.

Dos ramas pendientes de subir, ambas del mismo tema (Sprint 5, orden
estable de jornadas):
- `docs/quiniela-matchday-order-followup` (PR #34, solo documentación):
  **abierta sin mergear** — un intento de merge fue bloqueado por el
  clasificador de modo automático ("Merge Without Review"); pendiente de
  que el usuario la fusione él mismo.
- `fix/matchday-reference-order-by-next-kickoff` (el fix real, segunda
  vuelta, 2026-09-19): cambios commiteados en el árbol de trabajo, PR
  pendiente de abrir en la próxima acción de esta sesión.
