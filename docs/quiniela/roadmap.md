# Roadmap — Quiniela (Acerton)

Sprints agrupados por funcionalidad, no por fecha. Estado real a
2026-09-10, tras contraste directo del código (no supuesto). Leyenda:

- ⬜ Pendiente — no empezado.
- 🟡 Parcial — existe algo relacionado, pero no cumple la regla acordada
  tal cual, o falta verificar con precisión.
- 🔒 Bloqueado — no se puede empezar sin una decisión o un cambio previo
  (normalmente de modelo de datos).
- ✅ Hecho — implementado y verificado (se anota en qué plataformas).

El criterio de finalización completo está en `product-rules.md`. Resumen:
implementado + probado + criterios de aceptación verificados + estado real
por plataforma (web/iOS/Android) + documentación al día. No confundir
"implementado" con "validado en dispositivo".

---

## Sprint 0 — Preparación ✅ (esta sesión, 2026-09-10)

- ✅ Instalar la skill `/quiniela` y crear `docs/quiniela/`.
- ✅ Contrastar repo y reglas de producto (ver hallazgos en `decisions.md`
  y `backlog.md`).
- ✅ Documentar reglas con ejemplos (`product-rules.md`).
- 🟡 Diseñar evolución de datos y migración — solo a nivel de "qué falta"
  (ver backlog.md: Season, Trophy, roles de propietario, insignias
  globales, preferencias de notificación, avatares). El diseño de schema
  concreto (campos, migraciones) queda para el sprint que lo necesite
  (principalmente 3, 5, 6, 8, 9), no se ha hecho aquí.
- ✅ Identificar datos históricos insuficientes (ver backlog.md: rachas
  globales y estadísticas por temporada no tienen datos previos que migrar
  porque los conceptos no existen todavía).

## Sprint 1 — Interfaz de juego ✅ web / ⬜ iOS / ⬜ Android (2026-09-10)

Depende de: nada (independiente del resto).

Las 10 tareas están implementadas, compilan sin errores, y **verificadas
con un navegador real** (Chromium headless vía la skill
`browser-automation`, no solo lectura de código): cuenta nueva registrada,
unión a un grupo 1X2 ("test") y a uno de resultado exacto ("test2") con
datos reales de la base de datos local, interacción real con los
botones/inputs y comprobación del DOM/estilos computados resultantes. Sin
verificar todavía en iOS/Android (no hay dispositivo/simulador disponible
en esta sesión) — pendiente antes de dar el sprint por "Hecho" del todo.

| Tarea | Estado | Notas |
|---|---|---|
| Quitar spinner/tick de guardado en 1X2 | ✅ web | Verificado por inspección visual (capturas) — ya no aparece spinner/check en la fila 1X2. |
| Borde animado de selección hasta confirmación del servidor | ✅ web | Tercera iteración tras feedback del usuario. (1) Trazo direccional, no crecimiento radial: un `<rect>` SVG con `pathLength="100"` dibuja el contorno empezando arriba a la izquierda y avanzando hacia la derecha (orden natural del path: arriba, derecha, abajo, izquierda) hasta cerrar el circuito. (2) Sin borde verde estático de fondo mientras tanto — se quitó `.selected { border-color: accent }`, así que lo único verde visible durante el guardado es la propia línea del SVG. (3) La duración del trazo no es fija: avanza hacia un límite mientras se espera la respuesta real (sin saber de antemano cuánto tardará) y solo se cierra del todo cuando la respuesta llega — si la petición tarda 0.5s, el recorrido completo tarda ~0.5s (+ un remate de 0.18s para que el cierre no se vea brusco), no un tiempo inventado de antemano. Verificado leyendo `stroke-dashoffset` y `border-color` reales fotograma a fotograma con una petición retardada artificialmente (100ms, 500ms), no solo mirando capturas. |
| Verde cuando la última selección está confirmada | ✅ web | Al llegar la confirmación real (nunca antes de que el trazo se haya cerrado del todo), el fondo se rellena de verde con una transición de 0.35s aparte. Verificado: durante todo el trazo `background` se mantiene transparente; solo cambia justo después de que `drawOffset` llega a 0. |
| Permitir cambiar selección durante el guardado | ✅ (código) | Confirmado por lectura de código (no bloquea por `saving`); no se ha forzado el caso exacto en el test de navegador. |
| Evitar que respuestas antiguas pisen selecciones nuevas | ✅ (código) | `requestSeq` implementado y compilando; el caso de carrera real (dos respuestas cruzadas) no se ha forzado explícitamente en el test de navegador, solo el camino feliz. |
| Conservar selección en error + reintento | ✅ (código) | No se ha forzado un fallo real de red en el test de navegador (backend local no cae). Comportamiento correcto por lectura de código. |
| Etiquetas L/V sobre los inputs de resultado exacto | ✅ web | Iterado tras feedback: ya NO se repite en cada fila — aparece una sola vez como cabecera de columna encima de toda la lista, alineada con las casillas. Los dos inputs además se ven ahora como una sola caja (un solo borde), no dos campos sueltos, y esa caja recibe el mismo efecto de contorno animado que los botones 1X2 al guardar (sin relleno de fondo, ver fila siguiente). |
| Contorno animado también en resultado exacto (ampliación no pedida en el encargo original, añadida por feedback directo del usuario) | ✅ web | Mismo mecanismo que en 1X2 (`drawOffset` ligado a la duración real de la petición), aplicado a la caja combinada de L/V. Sin relleno de fondo al confirmar (rellenar taparía los números escritos) — solo cambia el color del borde. Sustituye al spinner/tick que este modo conservaba desde la primera versión del sprint. |
| Texto «La jornada se abre en» / «La jornada cierra en» | ✅ web | Confirmado el texto exacto en el DOM, y en viewport de 375px (iPhone SE) **cabe en una sola línea** sin partirse — el riesgo que se había anotado no se materializó con los datos de prueba usados. |
| Quitar fondo de «Faltan X por enviar» | ✅ web | Confirmado por estilo computado: `background-color: rgba(0,0,0,0)`. |
| Confirmación «Copiado» al copiar enlace de invitación | ✅ web | Iterado tras probar en `dev.acerton.app`: en vez de un snackbar, el propio icono del botón cambia de "copiar" a un tick durante 2s (botón deshabilitado ese rato, para no poder volver a pulsar), y vuelve solo al pasar el tiempo. Verificado leyendo el estado real del botón en varios instantes (antes, a los 500ms, a los ~2.2s). |
| Modal único de confirmación al cerrar sesión | ✅ web | Confirmado: aparece el diálogo, "Cancelar" mantiene la sesión, confirmar cierra sesión y navega a `/login`. |

**Bug encontrado y corregido durante esta verificación (no era parte de
las 10 tareas, pre-existía antes del sprint)**: el estado de guardado por
partido (`predictionState`, un `Map` en memoria del componente) no se
limpiaba al cambiar de grupo activo. Como un mismo partido de una
competición puede estar activo en varios grupos del usuario a la vez
(los partidos son globales, las predicciones son por grupo), cambiar de
grupo sin recargar la página podía dejar visible un check de "guardado"
de otro grupo en un partido que en el grupo actual no se había
pronosticado. Corregido con `this.predictionState.clear()` al inicio de
`load(groupId)`. Verificado con el mismo test de navegador: antes de la
corrección `leakedCheckmarkOnFirstRow: true`, después `false`. Documentado
también en `decisions.md`.

**Nota de presupuesto de estilos**: `current-matchday.component.scss` ya
iba casi al límite del budget de Angular (`anyComponentStyle`, 6kB de
error) antes de este sprint. Se subió a 4kB/10kB en `angular.json`
(decisión técnica documentada en `decisions.md`) porque varios
componentes ya superaban el umbral de warning anterior y bloqueaba
trabajo legítimo, no por descuido.

**Pendiente de verificar** (no forzado en esta sesión, riesgo bajo):
condición de carrera real con dos guardados casi simultáneos, fallo real
de red durante un guardado, y todo lo anterior repetido en iOS y Android
(solo se ha probado la versión web).

**Hallazgo aparte, no relacionado con este sprint** (anotado, no
investigado): al confirmar el cierre de sesión aparecen 2 errores 401 de
`/api/auth/refresh` en consola. No impide el logout (funciona
correctamente) y no lo causó ningún cambio de este sprint — parece un
intento de refresco de token que coincide con el cierre de sesión. Ver
`backlog.md`.

## Sprint 2 — Grupos y navegación ✅ web / ⬜ iOS / ⬜ Android (2026-09-10)

Depende de: nada, pero conviene después del Sprint 1 (mismo terreno de UI).
Las 11 tareas están implementadas y verificadas en web. Sin verificar
todavía en iOS/Android.

| Tarea | Estado | Notas |
|---|---|---|
| Formulario único de creación de grupo | ✅ web | `group-list.component.html`, bottom sheet `sheet-form`: nombre, descripción, modo de puntuación, privacidad, comodín, botón al final — todo en un único paso, sin distinguir cuenta nueva/existente. Ampliado (issue #18, causa raíz de "no veo puntos ni posición"): sin ninguna competición activa un grupo nunca llega a tener clasificación, y activarlas era un paso opcional posterior en Ajustes. Ahora es obligatorio elegir al menos una liga como primer paso del propio formulario de creación — el resto de campos (nombre, modo, privacidad) queda bloqueado hasta que se elige al menos una. Backend: `CreateGroupDto.competitionIds` obligatorio (`@ArrayMinSize(1)`), `GroupsService.create` activa esas competiciones en el momento (reutiliza `setCompetitions`, incluida la sincronización de jornada). Verificado: backend rechaza creación sin competiciones (400) tanto con el campo ausente como con array vacío; navegador confirma que el paso 2 del formulario no es accesible hasta elegir al menos una, y que el grupo creado ya tiene esas competiciones activas en Ajustes. |
| Selector Público/Privado de dos opciones | ✅ web | Cambiado el checkbox por un selector de dos botones (mismo patrón visual que el de modo de puntuación), con descripción de lo que implica cada opción y nota de que se puede cambiar después. Verificado en navegador: alterna correctamente entre los dos estados. |
| Privado por defecto | ✅ | Confirmado: `isPublic` en Prisma tiene `@default(false)`, y el form de creación arranca con "Privado" marcado. |
| Comodín con resumen + detalle ampliable | ✅ web | Añadido un enlace "¿Cómo funciona el comodín?" (solo visible en modo 1X2) que despliega un párrafo explicando la doble oportunidad y el recálculo semanal según la diferencia de puntos con el líder, coherente con `WildcardsService.getComebackStatus`. Verificado en navegador: se expande y contrae correctamente. |
| Botón "Crear grupo"/"Guardar cambios" al final, no fijo | ✅ (creación) / ✅ (ajustes) | Ya es así en ambos formularios. Corregido además en Ajustes → Reglas: el botón "Editar" estaba arriba, junto al título REGLAS, antes de ver las reglas — movido a "Editar reglas" al final de la lista, para que las reglas se lean antes del botón. Y unificado el guardado de Ajustes del grupo: antes había un botón "Guardar cambios" propio de Competiciones (arriba, tras la lista de ligas) y otro "Guardar reglas" propio de Reglas — ahora es un único botón "Guardar cambios" al final de toda la pantalla (tras Reglas, antes de Miembros) que guarda competiciones y reglas juntas en un solo click (si hay cambio de competiciones, primero pide confirmación por ser irreversible, y tras confirmar guarda también las reglas si las había editado). Verificado en navegador como admin real de un grupo: activar una competición nueva + cambiar "Puntos por opción doble" a la vez, un solo botón visible, un solo click guarda ambas cosas. Además, ese botón ahora es flotante: fijo encima de la barra de navegación inferior, con sombra, y solo visible/clicable cuando hay algún cambio pendiente (antes vivía al final del todo, tras la sección de Miembros, fácil de perder de vista al hacer scroll). El botón "Editar reglas" sigue en su sitio, dentro del flujo normal de la sección Reglas. Verificado: oculto y no clicable sin cambios (`opacity:0`, `pointer-events:none`), aparece al tocar una competición o una regla, y sigue guardando ambas cosas correctamente al pulsarlo. Además, "Grupo privado" y "Comodín de remontada" (que antes guardaban al toque, con su propia petición inmediata) ahora también quedan pendientes hasta pulsar "Guardar cambios", igual que el resto — verificado por red: tocar ambos toggles no dispara ninguna petición, y "Guardar cambios" manda los tres cambios (privacidad, comodín, puntos por opción doble) en una sola petición. |
| Guardar deshabilitado sin cambios válidos o con guardado en curso | ✅ | Competiciones ya lo tenía. Añadido el mismo patrón a "Guardar reglas": nuevo `hasRuleChanges` (valor dentro de 1-50 y distinto del actual) — antes se podía guardar sin haber cambiado nada. |
| Rueda de ajustes para acceder | ✅ | Decisión: se mantiene el icono de "sliders" actual (`settings-link`) — cumple el mismo propósito que una rueda literal, cambiarlo sería puramente cosmético y no lo pidió el usuario al revisar el sprint completo. |
| Entrada según nº de grupos (0 → crear/unirse, 1 → Jornada, varios → Grupos) | ✅ web | 0 grupos ya funcionaba (`hasGroupGuard` manda a `/welcome`). Añadido `GroupsService.postLoginRoute()`, usado en los 3 sitios donde se navega tras iniciar sesión (login/registro, Google nativo, callback de Google web): con 1 grupo va a Jornada, con varios a Grupos. Verificado en navegador: registro→0 grupos→`/welcome`; con 2 grupos ya unidos, reingresar lleva a `/groups`. |
| Pulsar un grupo lleva a su Tabla | ✅ web | `goToGroup()` en `group-list.component.ts` navegaba a `/matchday`, ahora navega a `/rankings`. Verificado en navegador. |
| Preview del grupo con posición general del usuario | ✅ web | Backend: `GroupsService.findMineForUser` adjunta ahora `myPosition` (posición + puntos de la última clasificación TOTAL), con el mismo criterio de scope que usa Tabla (competición única vs. general si hay varias activas). Frontend: la tarjeta de grupo muestra "Vas N.º · P pts" en vez del texto genérico cuando ya hay clasificación. Verificado con datos reales (no solo capturas): se comprobó que el endpoint recoge la clasificación más reciente generada por los crons de fondo. Efecto colateral bueno: de paso se corrigió que los chips de competiciones de la tarjeta nunca se mostraban (la consulta no incluía esa relación). Rediseño posterior (issue #18): la posición y los puntos ya no viven solo en el pie de la tarjeta — ahora hay una columna a la izquierda con la posición grande ("1º") y los puntos debajo en pequeño ("122pts"), separada del resto por una barra vertical; el resto de la tarjeta (avatar, nombre, chips, pie) sigue igual. Solo se muestra cuando `myPosition` existe (grupo sin competición activa todavía no tiene nada que mostrar ahí, es esperado). Verificado con datos reales del usuario: backend confirma posición reciente para sus grupos con competición activa (recalculada por el cron cada pocos minutos); el único caso sin posición era un grupo sin ninguna competición activada, no un fallo. |
| Grupo activo diferenciado en el selector | ✅ web | El menú desplegable de `group-switcher` marca ahora el grupo activo en verde con un check, el resto en gris. Verificado en navegador. Además, la propia lista "Mis grupos" (no solo el desplegable) marca la tarjeta del grupo activo con fondo y borde en verde y una insignia "Activo" — antes, al entrar en Grupos, no había forma de saber cuál era tu grupo activo sin abrir el desplegable. Verificado: solo una tarjeta marcada a la vez, y la marca se mueve correctamente al pulsar otro grupo. |
| Respetar destinos de enlaces directos | ✅ web | `authGuard` y `usernameGuard` ahora guardan la URL original como `returnUrl` (query param, o `sessionStorage` para el login de Google en web, que hace una redirección completa fuera de la app) y se vuelve ahí tras iniciar sesión, en los 4 flujos de login (email/password, registro, Google nativo, Google web) y en la confirmación de nombre de cuentas nuevas de Google. Antes, un enlace de invitación pulsado sin sesión iniciada se perdía sin más. Corregido de paso un bug real que rompía esto: `auth-page` renavegaba a `/login` sin conservar query params nada más cargar. Verificado con datos reales: un usuario sin cuenta que entra por un link de invitación acaba siendo miembro real del grupo tras registrarse. **Límite conocido, no cubierto**: si `hasGroupGuard` interrumpe (0 grupos, en una ruta que si lo exige) no se conserva el destino — caso raro, un link a algo de un grupo concreto no tiene mucho sentido sin pertenecer ya a él. |

Validar también: enlaces directos (invitación, deep link) y estados
vacíos (sin grupos, grupo sin competiciones activas).

## Sprint 3 — Roles y membresías ✅ (web)

Decisiones de schema tomadas el 2026-09-10 (ver `decisions.md`): `Group`
tiene ahora `ownerId` (campo directo, no un rol nuevo en `GroupRole`) y
`deletedAt` (borrado lógico).

| Tarea | Estado | Notas |
|---|---|---|
| Rol de creador/propietario distinto de admin | ✅ | `Group.ownerId`, distinto de `GroupRole.ADMIN`. El propietario mantiene además `role=ADMIN` en su membership. Migración con backfill: el propietario de cada grupo ya existente es su admin más antiguo. |
| Permisos de creador (nombrar/quitar admins, transferir, eliminar) | ✅ | Endpoints `PATCH /groups/:id/members/:userId/role`, `POST /groups/:id/transfer-ownership`, `DELETE /groups/:id`, todos exclusivos del propietario (`assertIsOwner`). |
| Permisos de admin (editar ajustes, expulsar miembros normales) | ✅ | Ya existía para ajustes; añadido `DELETE /groups/:id/members/:userId` (expulsar), exclusivo de admin (`assertIsAdmin`). |
| Admins no pueden expulsar/degradar a otros admins o al creador | ✅ | `kickMember` rechaza si el objetivo tiene `role=ADMIN` (incluye al propietario, que siempre es admin) — para quitarle el rol a un admin hace falta `updateMemberRole`, exclusivo del propietario. |
| Miembros ven opciones deshabilitadas, no ocultas | ✅ | "Salir del grupo" siempre visible, deshabilitado + texto de ayuda para el propietario. El menú de acciones por miembro (`more_vert`) solo aparece cuando el usuario actual tiene alguna acción disponible sobre esa fila. |
| Permisos aplicados en backend, no solo interfaz | ✅ | Verificado con peticiones HTTP directas (17 casos), no solo desde la interfaz — ver criterio de verificación abajo. |
| Salir del grupo con confirmación | ✅ | `POST /groups/:id/leave` + diálogo de confirmación en frontend. |
| Creador debe transferir o eliminar antes de salir | ✅ | Backend rechaza (400) si el propietario intenta salir sin transferir/eliminar antes; frontend deshabilita el botón directamente para el propietario. |
| Eliminar grupo conservando historia y trofeos | ✅ | Borrado lógico (`deletedAt`): el grupo deja de aparecer en `mine`/`public`/`findOne`/unirse por invitación, pero la fila y su historial (predicciones, rachas, insignias, clasificaciones) no se tocan. |
| Salir/expulsión conserva resultados | ✅ | Confirmado por esquema: `Prediction`, `Streak`, `UserBadge`, `RankingSnapshot` cuelgan de `userId`+`groupId` directamente, no de `GroupMembership.id` — borrar la membresía no arrastra nada de eso. |
| Reincorporación no reinicia fecha de participación | 🔒 | Sigue dependiendo del modelo de temporadas (Sprint 5) para tener algo que "reiniciar o no". |

**Verificado**: 17 comprobaciones de permisos por HTTP directo (owner/admin/miembro/ajeno intentando cada operación, incluyendo los casos que deben fallar) + flujo completo en navegador con dos sesiones reales simultáneas (propietario y miembro): insignias Creador/Admin, contenido exacto del menú de acciones según rol del objetivo, promover, degradar, transferir propiedad, salir, eliminar grupo y comprobación de que desaparece de "Mis grupos". Sin verificar todavía: iOS/Android (solo web).

## Sprint 4 — Tutorial ✅ (web)

**Diseño (corregido tras feedback del usuario)**: no es un modal centrado con texto suelto, es un recorrido guiado real — cada paso resalta (spotlight) un elemento de verdad en pantalla (`data-tutorial="..."` en la plantilla) con una burbuja anclada junto a él. `TutorialService` (global) lleva el estado; `TutorialCoachMarkComponent` (montado una vez en `app.component.html`, como el aviso de "sin dinero real") lo dibuja. El paso que señala el botón "Jornada" no tiene botón "Siguiente": avanza solo cuando el usuario pulsa de verdad ese botón (navegación real detectada por `Router`, no una pulsación interceptada), así que ese paso concreto sí depende de una acción real del usuario — pero nunca una que envíe un pronóstico.

| Tarea | Estado | Notas |
|---|---|---|
| Guía breve de botones principales | ✅ | `TutorialCoachMarkComponent` + `TutorialService`, 4 pasos: Tabla, botón Jornada, cómo puntuar, Grupos/Perfil — cada uno señalando el elemento real correspondiente. |
| Se inicia en la primera entrada a un grupo | ✅ | Se dispara desde `RankingsPageComponent` (Tabla, donde se aterriza al elegir un grupo) la primera vez que `user.tutorialCompleted` es `false`, sea cual sea el grupo. |
| Empieza en Tabla y explica el acceso a Jornada | ✅ | Paso 1 señala la cabecera de Tabla, paso 2 señala el botón "Jornada" del menú inferior — orden pedido por `product-rules.md`. |
| Adaptada al modo (1X2 / resultado exacto) | ✅ | Paso 3 (señala el primer partido de Jornada) cambia de contenido según `group.scoringMode` (elegir 1/X/2 + comodín vs. escribir marcador exacto). |
| Omitir, finalizar y repetir desde Perfil | ✅ | "Saltar tutorial" en cualquier paso; último paso dice "Empezar" en vez de "Siguiente". Perfil tiene "Ver tutorial de nuevo", que navega a Tabla y lo reabre desde el principio sin tocar el flag del backend (repetirlo no lo "des-completa"). |
| Persistencia por cuenta (no solo dispositivo) | ✅ | `User.tutorialCompletedAt` (migración `add_user_tutorial_completed_at`), `PATCH /users/me/tutorial-completed` (idempotente: no adelanta la fecha si ya estaba completado). |
| No reaparece en cada grupo | ✅ | La condición de disparo es el flag de cuenta, no algo por grupo — entrar a un segundo grupo no lo vuelve a mostrar. |
| No obliga a enviar un pronóstico real | ✅ | El único paso disparado por una acción real es pulsar el botón de navegación "Jornada" (no envía nada); el paso sobre elegir 1/X/2 o marcador exacto es solo explicativo, se avanza con "Siguiente" sin tocar ningún partido real. |
| Sin objetivo en pantalla (grupo sin partidos todavía) | ✅ | Si el elemento señalado no aparece en ~3s (sondeo cada 150ms), el paso se salta solo en vez de dejar el tutorial bloqueado con un hueco resaltando nada. |

Verificado en navegador (cuentas nuevas, no solo capturas, incluyendo la posición real del resaltado sobre cada elemento vía `getBoundingClientRect`): aparece al entrar por primera vez en Tabla tras crear un grupo; el paso "Jornada" no tiene botón propio y avanza solo al pulsar de verdad ese enlace del menú (navegación real a `/matchday` confirmada); el paso de partidos muestra el texto correcto tanto para modo 1X2 como para resultado exacto; recargar la página no lo vuelve a mostrar (persistido en servidor); desde Perfil, "Ver tutorial de nuevo" navega a Tabla y lo reabre desde el paso 1. Sin verificar: el caso de "sin partidos disponibles" (salto automático revisado en código, no provocado en navegador) e iOS/Android.

## Sprint 5 — Temporadas, estadísticas y rachas 🟡 en curso

**Decisión de modelo tomada con el usuario 2026-09-10** (ver
`decisions.md`): la temporada de un grupo termina cuando se cuenta el
último partido de todas sus competiciones activas (no una fecha fija) —
se puede dar un preview de cuándo, pero el cierre es definitivo solo tras
el recuento; si un partido se aplaza, se recalcula. Modelo nuevo
`GroupSeason` (por grupo, no global). Alcance de este sprint dividido en
incrementos por tamaño: primero la base de temporada, después
elegibilidad, racha global y estadísticas.

| Tarea | Estado | Notas |
|---|---|---|
| Modelo y migración de temporadas | ✅ | `GroupSeason` (por grupo, `endedAt` null mientras está en curso) + `Competition.seasonEndPreviewAt`. `SeasonsService.getOpenSeason` crea la temporada la primera vez que se puntúa una jornada del grupo (no al crear el grupo — un grupo recién creado sin ninguna jornada puntuada todavía no tiene fila en `GroupSeason`, es el comportamiento esperado). `RankingSnapshot.groupSeasonId` vinculado automáticamente en `RankingsService.persist`. |
| Preview y cierre real de fin de temporada | ✅ | `SeasonsService.refreshCompetitionPreview` pide el calendario completo de la competición al proveedor (una petición, no una por jornada) y guarda la fecha del partido más tardío conocido. `checkSeasonClosureAfterMatchdayFinished` (enganchado en `JobsService.finalizeMatchday`) solo gasta esa petición cuando una jornada terminada alcanza el preview conocido — si tras refrescar la competición sigue sin estar 100% `FINISHED`/`CANCELLED` (aplazamiento, algo nuevo en el calendario), no cierra nada y solo actualiza el preview. Cuando TODAS las competiciones activas de un grupo están así de terminadas, cierra su `GroupSeason`. 9 tests cubriendo: no cierre si otra competición del grupo sigue activa, cierre cuando todas terminan, y el caso de aplazamiento (recalcula sin cerrar) — no se puede provocar un cierre real en esta sesión (ninguna liga termina pronto), así que esta lógica se verifica por tests, no en vivo. |
| Etiqueta de temporada visible | ✅ web | "Temporada 2026/27" en la cabecera de Tabla (`GET /groups/:id/seasons`, la fila sin `endedAt`). Verificado en navegador. |
| Temporadas anteriores consultables | ⬜ | Backend ya guarda el historial (`SeasonsController.listSeasons` devuelve todas), falta UI para navegar a una temporada cerrada — ninguna se ha cerrado todavía en datos reales para poder diseñar esa pantalla con un caso real delante. |
| Añadir competiciones durante la temporada sin retroactividad | 🟡 | El toggle de competiciones activas ya existe (`GroupCompetition.isActive`), pero no hay noción de "desde qué jornada cuenta" ligada a temporada. |
| Elegibilidad de participación (50 %, jornadas ya cerradas al incorporarse) | ✅ | `EligibilityService.computeMemberEligibility`: jornadas disponibles = cerradas/finalizadas de las competiciones activas del grupo con `closesAt > joinedAt` (excluye las que ya habían cerrado al incorporarse); un pronóstico en cualquier partido de una jornada basta para contarla como participada (deduplicado); elegible con ≥ 50 % inclusive. `GET /groups/:id/eligibility` para toda la lista de miembros — base para "candidatos válidos" (mínimo 3) del reparto de premios en el Sprint 6. 8 tests unitarios (límite exacto del 50 %, exclusión por fecha de incorporación, deduplicación de jornada con varios partidos pronosticados). Verificado también en vivo contra el backend real (grupo recién creado → 0 disponibles, no elegible). |
| Racha global (todas las competiciones, deduplicando jornadas repetidas entre grupos) | ✅ | Modelo nuevo `GlobalStreak` (uno por usuario, no por grupo). `StreaksService.updateGlobalStreaks` se dispara tras el cierre de cada jornada (mismo evento que ya dispara las rachas por grupo), calcula la unión de grupos afectados y deduplica por `userId` con `distinct` tanto en la pertenencia a grupos como en las predicciones — así una misma jornada compartida por varios grupos del usuario no se cuenta dos veces. Mismo patrón de idempotencia (`lastMatchdayId`) y mismo cálculo de racha (`streak-calculator.ts`) que las rachas por grupo. `getGlobalForUser` expuesto en `GET /users/me/profile`; sustituye en Perfil la aproximación anterior (`Math.max` de las rachas por grupo, que podía sobreestimar si un grupo llevaba más jornadas que otro). 4 tests unitarios (forma exacta de las queries deduplicadas, participar en cualquier grupo cuenta, faltar una jornada la rompe, idempotencia) + verificado en vivo en el navegador. |
| Orden estable de jornadas por cierre de pronósticos | ⬜ | Pendiente de analizar casos simultáneos antes de implementar, como pide `product-rules.md`. |
| Estadísticas por temporada, globales y por grupo | ⬜ | No existe agregación de estadísticas más allá de `RankingSnapshot` (puntos/posición por jornada). |
| Separar estadísticas 1X2 / resultado exacto | 🟡 | El dato existe a nivel de grupo (`scoringMode` es fijo por grupo), pero no hay una vista agregada que las separe explícitamente. |

Probar: calendarios solapados entre competiciones, altas tardías a un
grupo, duplicación de un mismo partido entre grupos, repetición de
cálculos (idempotencia).

## Sprint 6 — Trofeos y podios 🔒

Depende del Sprint 5 (temporadas) y no puede empezar antes. No existe
ningún modelo de trofeo/premio en el schema actual.

| Tarea | Estado | Notas |
|---|---|---|
| Cálculo de candidatos válidos y mínimo de 3 | 🔒 | Depende de elegibilidad (Sprint 5). |
| Empates a la baja (última posición del bloque) | ⬜ | La lógica de ranking actual no se ha revisado para confirmar cómo asigna `position` en caso de empate — a verificar antes de construir el reparto de premios encima. |
| Catálogo de trofeos (general, por competición, más aciertos 1X2, más resultados exactos) | 🔒 | Requiere modelo nuevo (`Trophy`/`TrophyAward` o similar). |
| Registro histórico sin duplicados al recalcular | 🔒 | Depende del modelo anterior. |
| Distintivos oro/plata/bronce en Tabla | ⬜ | — |
| Contador de primeros premios generales en solitario | ⬜ | — |

Probar todos los ejemplos de empates dados en `product-rules.md` y el
caso del líder no elegible.

## Sprint 7 — Perfil y avatares 🟡 en curso (incremento 1 de avatares, 2026-09-12)

| Tarea | Estado | Notas |
|---|---|---|
| Nombre bloqueado 7 días | ✅ web | `User.nameChangedAt` (backend) + `profile-page.component.html`: el input de nombre ya no se oculta cuando no se puede cambiar — se muestra `[disabled]` con el nombre actual dentro, y el hint "Ya lo has cambiado. Podrás hacerlo de nuevo el dd/MM/yyyy" debajo. Implementado durante el repaso visual Piqo 4.1 (rama `dev`, no como incremento explícito de este sprint), detectado al reconciliar el roadmap. Sin verificar iOS/Android. |
| Restricción aplicada en servidor | ✅ | Ya existe (`UsersService.updateName`, según referenciado en el código). |
| Catálogo de avatares predeterminados | ✅ web | El usuario aportó 13 imágenes de la mascota "Piqo" (`C:\Users\34655\Downloads\piqopetimg`), procesadas con `sharp` (recortadas, centradas, 512×512, fondo transparente, ~55-68 KB cada una — el original pesaba hasta 1.6 MB) y servidas desde `frontend/public/assets/avatars/mascot/<id>.png`. Paleta cerrada de 8 colores de fondo a juego con la marca (champán/grafito + 6 tonos apagados complementarios, no los tokens semánticos `--p4-success` etc. para no mezclar significado funcional con personalización). Catálogo cerrado (no URLs/colores libres) validado en servidor (`class-validator` `@IsIn`) — ver nota de "Subida de foto" sobre por qué no se acepta aún cualquier imagen. `GET /users/me/avatar-catalog` expone la lista para que frontend y backend no diverjan. Nueva pantalla `/profile/avatar` (grid de mascotas + swatches de color + vista previa en vivo), enlazada desde el avatar de Perfil. Nuevo componente compartido `app-avatar` (foto/mascota + color, o iniciales si no hay nada elegido) usado en top-bar y Perfil — pendiente extenderlo a Tabla/miembros de grupo, que hoy siguen solo con iniciales. Verificado en navegador real (cuenta nueva): selección, vista previa, guardado, persistencia tras volver a Perfil y recargar. **Ampliado el mismo día**: 7 mascotas más sosteniendo un trofeo (una por cada trofeo del catálogo de Vitrina — Champions, LaLiga, Bundesliga, Ligue 1, Europa League, Serie A, Copa Piqo), solo elegibles si el usuario tiene esa copa. **Límite conocido, documentado en el código** (`avatar-catalog.ts`): "tener esa copa" hoy se comprueba en el frontend contra el mismo catálogo de muestra de la Vitrina (recuento fijo, igual para todos — ver fila de Sprint 6 en este mismo roadmap), no un dato real por usuario; el backend acepta cualquier mascota de trofeo sin comprobar nada porque no existe todavía una fuente de verdad de trofeos con la que hacerlo. En cuanto exista un modelo real (Sprint 6), la comprobación debe moverse también al backend. La asignación aleatoria al registrarse (fila de abajo) nunca elige una mascota de trofeo. Verificado en navegador real: mascotas sin trofeo en gris con candado y sin poder seleccionarse; las que sí están "conseguidas" en la Vitrina de muestra (Champions, Copa Piqo) seleccionables con normalidad. |
| Asignación automática al registrarse | ✅ | `AuthService.register` asigna una mascota y un color aleatorios del catálogo (`randomCatalogAvatar`) sin ningún paso extra en el formulario. Las cuentas de Google no lo necesitan: ya llegan con la foto real de su perfil de Google. Verificado por API (registro real, `avatarUrl`/`avatarBackground` no nulos en la respuesta). |
| Subida de foto, recorte, previsualización circular | 🔒 | Bloqueado por una decisión de infraestructura sin tomar: no existe ningún almacenamiento de imágenes hoy (sin S3/Cloudinary/similar configurado, sin `multer` ni librería de subida instalada) y Render (donde vive el backend) no tiene disco persistente utilizable para esto. La pantalla `/profile/avatar` ya deja un hueco visible ("Subir foto — próximamente") para no prometer algo que no hace. Antes de implementarlo hay que decidir proveedor y coste con el usuario, como se hizo con el entorno dev/pre. |
| Sustituir foto o volver a avatar del catálogo | 🔒 | Depende de la subida de foto de arriba — hoy solo hay "avatar de catálogo", no hay "foto propia" que sustituir. |
| Validar formato/tamaño y quitar metadatos privados (EXIF, etc.) | 🔒 | Depende de la subida de foto de arriba. |
| Abrir perfiles desde nombre/avatar en Tabla | 🟡 | Hoy `rankings-page` ya navega a `matchday/:matchdayId/results/:userId` al pulsar una fila (`viewUserPicks`), que muestra los pronósticos de esa persona — pero no es una "página de perfil" con avatar/trofeos/estadísticas, es la vista de resultados de jornada ajena. |
| Perfil ajeno (avatar, nombre, favoritas, trofeos, estadísticas, rachas) | ⬜ | No existe como pantalla propia todavía. |
| Historial reciente entre dos usuarios del mismo grupo | 🟡 | El usuario indica que esta lógica ya existe — a confirmar qué es exactamente (posiblemente la vista de resultados de jornada ajena de arriba) y ajustar su presentación, sin reescribirla si ya funciona. |

Verificar privacidad (no exponer datos privados en perfil ajeno) y manejo
de fallos de subida de imagen.

## Sprint 8 — Insignias

| Tarea | Estado | Notas |
|---|---|---|
| Alcance global (no por grupo) | 🔒 | Hoy `UserBadge` es único por `(userId, badgeId, groupId)` — la misma insignia se puede ganar una vez por grupo (`BadgesService.award`). Pasar a global requiere migración de deduplicación: decidir qué fecha/grupo se conserva como `earnedAt` canónico cuando ya se ganó en varios grupos. Ver `backlog.md`. |
| Quitar referencias a "este grupo" donde no corresponda | ⬜ | Las descripciones actuales del seed (`"...en este grupo"`) asumen scope por grupo — revisar textos al migrar a global. |
| Catálogo ampliado (20 insignias, a petición del usuario) | 🟡 | Primera pasada (2026-09-15): 6 de las 7 que faltaban del catálogo propuesto de 12 (`STREAK_25` Incombustible, `PREDICTIONS_100` Centenario, `ONE_X_TWO_HITS_25`/`100` Buen ojo/Experto en 1X2, `EXACT_SCORE_HIT_1`/`HITS_10` Al milímetro/Francotirador). El usuario pidió llegar hasta 20 en la misma sesión; segunda pasada con 9 insignias nuevas fuera ya del catálogo original de `product-rules.md` (no hay más propuestas ahí, son de cosecha propia sobre mecánicas ya existentes): `HOT_STREAK_10` (Racha de fuego), `PREDICTIONS_500` (Leyenda), `PERFECT_MATCHDAY` (Pleno, todos los partidos de una jornada con puntos), `WILDCARD_HITS_5` (Comodín de oro, el comodín de remontada dio puntos de verdad — mismo criterio que `rescueHits` del frontend), `GROUPS_JOINED_3` (Sociable), `DRAW_HITS_10` (Especialista en empates), `COMPETITIONS_3` (Multiliga, en cualquiera de tus grupos), `GROUP_FOUNDER` (Fundador — única que no espera a que cierre una jornada, se concede al crear el grupo desde `GroupsService.create()`), `PODIUM_5` (En el podio, top-3 semanal acumulado). Total: 20 insignias. Falta solo "Campeón" (primer premio de temporada, la única de las 12 originales sin implementar): depende de temporada cerrada de verdad + modelo de trofeos (Sprint 6, 🔒 sin modelo todavía) — no se ha inventado una condición sustituta. Ninguna de las 15 nuevas tiene arte 3D propio (`assets/art.js`/`insignias/3d/*.png`, ver `HANDOFF §18` — los 5 motivos originales se dieron por fijos): usan el icono genérico de fallback ya existente (medalla conseguida / candado pendiente, ver `badge-art.ts` → `null` y `profile-badges.component.html`). GROUPS_JOINED_3/COMPETITIONS_3/PODIUM_5 son condiciones de cuenta (no de un grupo concreto) pero se conceden ancladas al grupo que disparó la comprobación — no hay insignia "sin grupo" hoy (ver fila "Alcance global" más abajo, sigue 🔒). 31 tests unitarios nuevos (21 en `badges.service.spec.ts`, 1 en `groups.service.spec.ts` para Fundador) + verificado en navegador y base de datos real (progreso real, y Fundador concedido de verdad al crear un grupo de prueba). Sin verificar iOS/Android. |
| Renombrar "Jornada perfecta" → "En lo más alto" | ⬜ | Ver nota de `backlog.md`: la condición actual (`MATCHDAY_TOP_1`) premia empates; el nuevo catálogo la define "en solitario" — decidir cuál se aplica antes de renombrar. |
| Hasta 3 favoritas, solo entre conseguidas | ⬜ | — |
| Favoritas visibles como logos bajo el nombre en Perfil | ⬜ | — |
| Popup con descripción y % de usuarios que la tienen (sobre el total de registrados) | ✅ web | Backend: `GET /badges/stats` (`BadgesService.getEarnStats`) — % de usuarios con al menos una fila de `UserBadge` para cada insignia, deduplicado por `userId`+`badgeId` (no cuenta dos veces a quien la ganó en varios grupos), sobre `User.count()` total. Frontend: `BadgeDetailDialogComponent` muestra descripción, estado conseguida/pendiente y "La tienen el N% de los jugadores." Implementado durante el repaso visual Piqo 4.1 (rama `dev`), detectado al reconciliar el roadmap. Sin verificar iOS/Android. |
| Progreso numérico + barra cuando sea medible | ✅ web | `BADGE_TARGETS` (backend, `badges.service.ts`) fija el umbral de cada insignia medible (STREAK_5→5, STREAK_10→10, HOT_STREAK_5→5) y lo reutiliza tanto para conceder la insignia como para calcular el progreso — no pueden desincronizarse. `GET /badges/me/progress` devuelve, para cada una, la mejor racha/racha de aciertos entre todos los grupos del usuario (basta con llegar al umbral en uno para desbloquearla). `FIRST_MATCHDAY_PLAYED` y `MATCHDAY_TOP_1` se quedan explícitamente sin barra: son logros de un solo evento, no algo que se acumule hacia un número. Barra + "N/M" en la pantalla de Insignias y en el popup de detalle. 4 tests unitarios + verificado en vivo contra la base de datos real de desarrollo (racha real de 3 mostrando 3/5 y 3/10) y en navegador. |
| Concesión retroactiva cuando los datos lo permitan | ⬜ | A evaluar insignia por insignia qué datos históricos existen. |
| Conservar desbloqueos existentes durante la migración a global | 🔒 | Depende de resolver primero la deduplicación mencionada arriba. |

Probar que el cálculo de progreso y el de desbloqueo usan exactamente la
misma regla (para que no se desincronicen).

## Sprint 9 — Notificaciones 🟡 en curso (incremento 1, 2026-09-12)

**Incremento 1 (completo, rama `feature/sprint-9-notificaciones`)**: modelo de
preferencias por cuenta, silenciar grupo, y aplicar ambos a los avisos que
ya existían (recordatorios de cierre y jornada terminada) más uno nuevo
(insignia conseguida). Deja fuera, para incrementos siguientes, todo lo que
requiere un disparador nuevo que no existe hoy en `jobs.service.ts`
(apertura de jornada, partido individual terminado, agrupar mismo partido
entre grupos) y lo que depende de sprints no implementados (temporada/
trofeos, Sprints 5-6).

| Tarea | Estado | Notas |
|---|---|---|
| Preferencias por cuenta + silenciar grupo, en interfaz desplegable con controles independientes | ✅ web | Modelo `NotificationPreference` (1:1 con `User`, creado de forma perezosa como `GlobalStreak`) + `GroupMembership.mutedNotifications`. Backend: `GET/PATCH /users/me/notification-preferences`, `PATCH /groups/:id/mute`. Frontend: pantalla `/notifications/preferences` (enlazada desde Perfil) con secciones `<details>` plegables ("Jornadas", "Actividad", "Grupos silenciados") y un toggle independiente por preferencia, más la lista de grupos propios con su mute. Distingue explícitamente el permiso del dispositivo (tarjeta separada arriba, mismo componente que ya existía en Perfil) de las preferencias de cuenta. Verificado en navegador real (cuenta nueva): toggle óptimo con reversión si falla la petición, persistencia tras recargar, mute en rojo para diferenciarlo visualmente de los demás toggles. |
| Apertura de jornada (activada por defecto) | 🟡 | La preferencia existe (con su default `true`) pero **no envía nada todavía**: no hay ningún evento de "jornada abierta" en `jobs.service.ts` — el `status` de `Matchday` nunca pasa por `SCHEDULED` en la práctica (`deriveInitialStatus` la crea ya `OPEN`), así que "abrirse para pronosticar" es hoy una función calculada en cada petición (`canPredict`+`opensAt` en `MatchdaysService`), no un cambio de estado que un cron pueda detectar una vez. Implementarlo bien requiere una comprobación periódica de esa misma regla por competición, con su propio campo "ya avisado" — pendiente de incremento futuro. |
| Recordatorios 24h/5h/1h/30min, selección múltiple, solo 1h por defecto | ✅ | `Matchday.reminder24hSentAt` añadido (antes solo 5h/1h/30min). `JobsService.REMINDER_TIERS` con 4 franjas, cada una ligada a su propia preferencia (`reminder24h/5h/1h/30m`) — seleccionar varias es independiente por diseño (son 4 booleanos sueltos). Defaults iguales a los del encargo (todas `false` salvo `reminder1h`). 1 test unitario nuevo (`sendClosingReminders`) que confirma que con un cierre a 23h solo dispara la franja de 24h con su preferencia correcta. |
| Recordatorios solo cuando falten pronósticos | ✅ | Sin cambios en esta parte de la lógica (`pendingUserIds` ya lo hacía) — reconfirmado con los 7 tests existentes/nuevos de `notifications.service.spec.ts`, que siguen pasando tras añadir el filtro de preferencias por encima. |
| Partido terminado con puntos (desactivado por defecto) | ⬜ | Preferencia creada (`matchFinishedPoints`, default `false`) pero sin disparador: es un aviso por partido individual ya terminado, distinto del de jornada completa que ya existía — no se ha tocado `MatchdaysService`/`JobsService` para detectar "este partido concreto acaba de terminar" a nivel de usuario. Pendiente de incremento futuro. |
| Jornada terminada con resultado y posición (activada) | ✅ web | `NotificationsService.notifyMatchdayFinished` ahora incluye la posición real (`getPositionForUser`, mismo criterio de alcance general/por competición que `GroupsService.findMineForUser`) además de los puntos, y se filtra por la preferencia `matchdayFinishedResult` + grupo no silenciado. 2 tests nuevos (incluye posición cuando hay snapshot; no avisa si la preferencia está desactivada). |
| Insignia conseguida (activada) | ✅ | Nuevo `NotificationsService.notifyBadgeEarned`, filtrado solo por la preferencia de cuenta `badgeEarned` (no por grupo silenciado — una insignia es de la cuenta, no del grupo, ver comentario en el código). `BadgesService.award` ahora distingue "ya la tenía" de "recién concedida" (antes un `upsert` no lo permitía saber) y `evaluateAfterMatchdayClose` devuelve las insignias nuevas de esa pasada para que `JobsService` avise solo de logros genuinamente nuevos. 2 tests nuevos. |
| Temporada terminada y trofeos (activada) | 🔒 | Preferencia creada con su default (`true`) pero sin efecto: sigue dependiendo de que exista temporada cerrada de verdad (Sprint 5, sin cerrar ninguna real todavía) y trofeos (Sprint 6, sin modelo). |
| Agrupar mismo partido jugado en varios grupos en un solo aviso | ⬜ | Sin tocar — `notifyMatchdayClosingSoon`/`notifyMatchdayFinished` se siguen llamando una vez por cada `GroupCompetition` que usa la competición, así que un usuario en dos grupos con la misma liga sigue recibiendo dos avisos separados para el mismo partido/jornada. |
| No duplicar ni reenviar recordatorios antiguos al cambiar preferencias | ✅ | Verificado por diseño: los campos `reminderXSentAt` siguen siendo por jornada+franja (no por usuario), así que cambiar una preferencia nunca reabre un envío ya hecho — solo decide si un envío nuevo, futuro, te incluye o no. |
| No avisar de grupos silenciados o abandonados | ✅ | `filterByPreference` descarta a quien tiene `GroupMembership.mutedNotifications` para ese grupo, en recordatorios de cierre y en jornada terminada. Abandonados ya se excluían solos (las consultas parten de `GroupMembership`, que no existe tras salir del grupo). 1 test nuevo (no avisa a quien silenció el grupo). |
| Verificar regularidad del hosting del backend para los crons necesarios | ⬜ | Sin tocar — sigue igual que el 2026-09-10 (ver `backlog.md`). |
| Feed real de avisos (pantalla "Avisos") y campanita del top-bar | ✅ web | Issue #21, a petición explícita del usuario ("podemos crear ya la vista de notificaciones?"). Nuevo modelo `Notification` (userId, type, title, body, groupId?, matchdayId?, readAt, createdAt) — una fila por cada push real que `NotificationsService` decide enviar (`notifyMatchesClosingSoon`, `notifyMatchdayFinished`, `notifyBadgeEarned`, `notifyReengagement`), con los mismos filtros de preferencia/silencio ya aplicados al push, así que el feed y el push nunca se desincronizan en quién los recibe. `record()`/`recordMany()` no lanzan si falla la escritura (el feed es secundario al push real). Backend: `GET /notifications/me` (últimos 50, más recientes primero), `POST /notifications/me/read-all` (en bloque, sin marcar aviso a aviso). Frontend: `NotificationsFeedService` pasa de `DEMO_NOTICES` a la API real; `domain/demo-notice.ts` reemplazado por `domain/notice.ts` (mapea tipo→icono, calcula periodo Hoy/Esta semana/Anterior y la etiqueta de tiempo relativo); estado vacío real en vez del aviso "vista de demostración"; secciones vacías ya no pintan cabecera. Campanita restaurada en el top-bar (estaba escondida a propósito desde el 2026-09-12) con el contador real de sin-leer, cargado una vez por sesión al montar el shell. 6 tests unitarios nuevos en `notifications.service.spec.ts` (persistencia por cada tipo de aviso + `getFeedForUser`/`markAllRead`) — los 231 tests del backend en verde. Verificado en navegador con avisos reales insertados con la forma exacta que genera el backend: iconos correctos por tipo, agrupación por periodo, tiempo relativo, badge "3" en la campanita, "Leer todo" marca de verdad en base de datos (confirmado con SQL) y persiste tras recargar. Sin verificar iOS/Android. |

Validar permisos de notificación y entrega real en las tres plataformas
cuando haya dispositivos y credenciales disponibles. Migración aplicada y
probada contra la base de datos real de desarrollo (no solo tests): fila de
preferencias creada de forma perezosa al primer `PATCH`, mute de grupo
verificado por API y por navegador (ver `history.md`).

## Sprint 10 — Validación integrada ⬜

Depende de que los sprints anteriores estén, al menos, funcionalmente
completos. No se detalla tarea por tarea aquí porque su contenido depende
directamente de cómo queden implementados los sprints previos; ver
`product-rules.md` § "Criterio de finalización" para el alcance esperado
(flujo completo registro→grupo→tutorial→pronóstico→tabla→perfil, roles,
temporada simulada con empates, consistencia entre estadísticas/premios/
insignias, migración con datos representativos, pantallas pequeñas, áreas
seguras, claro/oscuro, accesibilidad, notas de versión).

La publicación es un paso separado y no se dispara automáticamente al
completar este sprint.

## Sprint 11 — Piqo Premium (monetización) ⬜ (añadido 2026-09-12, a petición del usuario)

Precios acordados con el usuario: **0,99 €/mes** o **9,99 €/año**
(equivale a ~2 meses gratis frente al mensual). Suscripción, no compra
única — necesita renovación automática vía IAP de Apple/Google. Ninguna
ventaja afecta a la mecánica del juego (puntos, aciertos, quién gana la
quiniela): todo es cosmético, de conveniencia o de límites de uso, para no
romper el posicionamiento "juego social gratuito, sin apuestas" ya fijado
en el producto (`no-real-money-notice`, textos de marketing).

| Tarea | Estado | Notas |
|---|---|---|
| Infraestructura de suscripción (IAP iOS/Android + validación de recibo + modelo `User.isPremium`/fecha de expiración en backend) | 🔒 | Bloqueado por una decisión de proveedor sin tomar: implementar StoreKit/Play Billing a mano (dos integraciones nativas + validación de recibo propia) o un intermediario tipo RevenueCat (una integración, coste extra por ingresos). Todo lo demás de este sprint depende de esto — sin una fuente de verdad de "es premium hasta cuándo" en el backend, ninguna ventaja se puede aplicar ni proteger del lado servidor. |
| Planes 0,99€/mes y 9,99€/año en App Store Connect / Play Console | ⬜ | Alta de los productos de suscripción en ambas tiendas; depende de la fila anterior para poder validarlos. |
| Quitar anuncios (general) | ⬜ | Depende de `isPremium`: `AdsService` (AdMob) ya existe, hace falta que consulte el estado premium antes de pedir intersticial/rewarded. |
| Modo sin anuncios/banners específicamente en la pantalla de Jornada | ⬜ | Puede ir junto con la fila anterior o quedar como verificación aparte si Jornada tiene algún banner propio distinto del resto de pantallas — a confirmar contra el código de `AdsService` al implementar. |
| Mascotas y fondos de avatar exclusivos para premium | ⬜ | Amplía el catálogo cerrado de `avatar-catalog.ts` (Sprint 7) con una marca "solo premium", igual que ya existe "solo con ese trofeo". |
| Marcos de avatar animados | ⬜ | Nuevo, no existe hoy ningún "marco" alrededor del avatar — a diseñar (SVG/CSS o igual que los GIFs de trofeo animados ya existentes). |
| Comodines extra por temporada | ⬜ | Depende de la lógica de comodín/remontada ya existente (`WildcardsService`) — añadir un límite superior distinto para cuentas premium. |
| Histórico ampliado de temporadas anteriores | ⬜ | Depende también del Sprint 5 ("Temporadas anteriores consultables", hoy ⬜ — sin eso no hay histórico que ampliar). |
| Grupos ilimitados | ⬜ | Hoy no hay límite de grupos simultáneos para ninguna cuenta — para que esto sea una ventaja premium primero hace falta decidir y fijar un límite gratuito (número a acordar con el usuario), luego eximir a premium de él. |
| Insignias/trofeos exclusivos de marca premium | ⬜ | Depende del catálogo de insignias (Sprint 8, con su propio ⬜ de catálogo ampliado) y del modelo de trofeos (Sprint 6, 🔒 sin modelo todavía) — coordinar para no duplicar trabajo de catálogo. |
| Personalización de icono/color de portada del grupo | ⬜ | Grupos no tienen hoy ningún icono/color propio distinto del que ya deriva de su modo de puntuación (ver el resto del roadmap) — nuevo campo + UI de elección, restringido a premium. |
| Notificaciones anticipadas de cierre de jornada (antelación mayor que las franjas ya existentes) | ⬜ | Depende del Sprint 9 (recordatorios 24h/5h/1h/30min ya implementados) — añadir una franja premium con más antelación (p.ej. 48h), o permitir elegir antelación libre. |

Validar además: qué pasa con las ventajas premium si la suscripción expira
(degradar sin borrar datos — p.ej. un avatar exclusivo ya elegido, un
grupo por encima del límite gratuito), y si alguna ventaja necesita
aplicarse también en Android/iOS nativo o solo en la valoración del
backend.

## Sprint 12 — Compartir resultados ✅ (añadido 2026-09-13, a petición del usuario)

Hoy "Copiar resumen" (pantalla "Enviado" de Jornada) copia solo texto
plano de los pronósticos (`predictionSummary`/`summaryText`). Se pide
generar una imagen visual de esos resultados y poder compartirla, además
de que "Copiar resumen" copie esa imagen en vez de texto. **Descartado
explícitamente**: integración directa con la API de X/Twitter (publicar
el tweet desde la app) — requeriría OAuth propio y acceso de pago a su
API, coste desproporcionado frente al share nativo del sistema, que ya
deja elegir X (o cualquier otra app) desde el propio selector del
dispositivo.

| Tarea | Estado | Notas |
|---|---|---|
| Diseñar tarjeta visual de resultados/pronósticos | ✅ | Dibujada a Canvas (Canvas API nativo), no una librería de captura de DOM tipo html2canvas (da problemas con fuentes/gradientes/sombras) — reutilizando la paleta/tipografía ya establecida de Piqo. Variante `picks` (Jornada → Enviado) y variante `results` (matchday-results). |
| Generar la imagen a partir de los datos reales de la jornada | ✅ | A partir de las predicciones reales de `current-matchday.facade.ts` / `matchday-results.facade.ts` (puntos, aciertos, puesto, racha), no un dato de muestra. |
| Botón "Compartir imagen" con el share nativo del sistema | ✅ | Usa la Web Share API (`navigator.share`/`canShare`) directamente, sin `@capacitor/share` ni `@capacitor/filesystem` — no hizo falta instalarlos porque WKWebView en iOS soporta Web Share API de forma nativa. Si el navegador no la soporta, descarga el PNG como fallback. |
| Botón "Copiar" para pegar la imagen directo en otra app/chat | ✅ | Vía Clipboard API (`navigator.clipboard.write` + `ClipboardItem` con `image/png`), con un timeout de 4s (`Promise.race`) porque en algún entorno la promesa no resuelve ni rechaza nunca. Sustituye al "Descargar PNG" inicial: descargar ya es posible desde "Compartir imagen". No se tocó el botón "Copiar resumen" existente (sigue copiando texto). |

Pendiente de validar en dispositivo real (iOS) tras la build: el
comportamiento de Web Share y Clipboard dentro de WKWebView puede diferir
del navegador de escritorio usado para la verificación en `ng serve`.

## Sprint 13 — Chat de grupo ⬜ (añadido 2026-09-15, a petición del usuario)

Deliberadamente aparcado lejos en el roadmap, **después** del Sprint 11
(Premium): a diferencia del resto de sprints pendientes, aquí el riesgo
no es solo de esfuerzo sino de bloqueo de publicación y de cumplimiento
legal, así que no tiene sentido priorizarlo mientras haya sprints con
mejor ratio valor/riesgo por delante.

Idea de diseño ya barajada con el usuario: mensajes efímeros con TTL de
7 días (se borran solos, vía un job de limpieza igual que los ya
existentes en `@nestjs/schedule`). Ayuda con retención de datos
(RGPD/DSA) y con que el almacenamiento no crezca sin límite, pero **no
sustituye** la moderación exigida por Apple — reportar/bloquear hace
falta igual, independientemente de cuánto dure un mensaje (y un mensaje
reportado probablemente deba conservarse más allá del TTL hasta
resolverse).

| Tarea | Estado | Notas |
|---|---|---|
| Decidir alcance: chat privado (dentro de grupo) vs también en grupos públicos | ⬜ | En público el riesgo de abuso/spam es mucho mayor — si se hace, probablemente solo grupos privados. |
| Moderación (guideline 1.2 de Apple para contenido generado por usuarios) | 🔒 | Imprescindible para pasar App Store: reportar mensajes, bloquear usuarios, canal de contacto para abusos, y filtro de contenido. Sin esto la app puede ser rechazada o retirada — no es opcional si hay texto libre entre usuarios, ni aunque los mensajes caduquen solos. |
| Mensajes efímeros (TTL 7 días) vía job de limpieza | ⬜ | Reduce huella de datos (RGPD/DSA) y acota el almacenamiento; excepción a decidir para mensajes con un reporte abierto (conservarlos hasta resolver, no borrarlos a los 7 días). |
| Cumplimiento RGPD/DSA de los mensajes | ⬜ | Más datos personales que retener/borrar; bajo la DSA, obligaciones de transparencia de moderación además de la propia declaración de comerciante. |
| Infraestructura en tiempo real | ⬜ | Hoy la app es REST + cron (`@nestjs/schedule`), sin nada de tiempo real — haría falta WebSockets o Firebase Realtime/Firestore (ya hay proyecto Firebase para push, podría reutilizarse). Pieza de arquitectura nueva, no una extensión de lo existente. |
| Preferencia de silenciar chat por grupo | ⬜ | Mismo patrón que `GroupMembership.mutedNotifications` (Sprint 9) — evitar que compita con avisos de jornada/insignias sin control. |
| Alternativa más barata a evaluar antes de construir chat completo | ⬜ | Reacciones/emoji sobre pronósticos o un feed de actividad del grupo dan parte de la interacción social sin la carga de moderar texto libre — valorar si cubre la necesidad antes de meterse en todo lo anterior. |

## Sprint 14 — Sistema de nivel y experiencia 🟡 en curso (añadido 2026-09-15, a petición del usuario)

Gamificación transversal (no depende de grupos ni de temporadas): cada
cuenta gana experiencia (XP) al participar y acertar, sube de nivel, y
desbloquea colores/avatares (y en el futuro marcos de foto) según el
nivel alcanzado. Mismo patrón de enganche que insignias/racha global:
se calcula tras el mismo evento de cierre/puntuación de jornada
(`evaluateAfterMatchdayClose`), no una arquitectura nueva.

**Fuentes de XP, de más a menos valor (orden dado por el usuario)**:
1. Pleno de jornada en modo resultado exacto (sube mucho) — misma
   condición que la insignia `PERFECT_MATCHDAY` (Sprint 8), reutilizable.
2. Pleno de quiniela — **pendiente de definir exactamente qué cuenta
   como esto** (¿pleno de una jornada en 1X2, equivalente al anterior
   pero en el otro modo de puntuación? ¿otra cosa?).
3. Invitar a un amigo (sistema de referral por link, nuevo) — con caída
   permanente de XP por cada referido adicional de la misma cuenta
   (nunca llega a 0, pero el suelo debe ser insignificante frente al
   XP de un nivel) para que farmear cuentas falsas no compense. El
   contador de referidos no se resetea nunca (ni por temporada ni por
   mes).
4. Aciertos de resultado exacto.
5. Acierto 1X2 / acierto ganador en modo resultado exacto (mismo valor
   entre sí).
6. Acierto con comodín en el 1X2.
7. Participar (flat, por el mero hecho de pronosticar).

Progresión dentro de una misma jornada: más aciertos da
proporcionalmente más XP por acierto adicional — **no implementado
así**: se optó por un valor fijo por tipo de acierto (ver tabla), más
simple y ya ordenado igual que pidió el usuario; revisar si hace falta
más adelante una escala progresiva de verdad.

**Valores implementados** (`backend/src/xp/xp.util.ts`, `XP_VALUES`):
participar 5 XP, acierto con comodín en 1X2 15 XP, acierto 1X2 normal
25 XP, acierto ganador en resultado exacto 25 XP, acierto de resultado
exacto (marcador clavado) 60 XP, pleno de jornada en 1X2 130 XP, pleno
de jornada en resultado exacto 150 XP — mismo orden pedido por el
usuario. Curva de nivel: 200 XP el nivel 1, +150 XP cada nivel
siguiente, tope en nivel 18 (`xpProgressForLevel`).

| Tarea | Estado | Notas |
|---|---|---|
| Modelo de XP total + log de eventos por usuario | ✅ | `User.experience` (total acumulado, nunca baja) + `XpEvent` (una fila por racion concedida, mismo criterio que `Notification`). |
| Curva de nivel (XP necesario por nivel) | ✅ | `xp.util.ts`: `xpForLevel`/`xpProgressForLevel`, tope en nivel 18. Mismos valores en el frontend (`level-progress.domain.ts`, todavía sin unificar en un paquete compartido — duplicado a propósito, igual que `scoring.util.ts` no se comparte con el frontend). |
| Cálculo de XP enganchado al cierre de jornada | ✅ | `XpService.evaluateAfterMatchdayClose`, mismo punto que `BadgesService` en `JobsService.finalizeMatchday`. Cubre acierto 1X2 (normal y con comodín), acierto de resultado exacto (marcador exacto vs solo ganador) y pleno de jornada (ambos modos) — todo lo que depende del resultado real del partido. Sin cubrir todavía: XP por invitar a un amigo y por entrar cada día (ver filas de abajo). |
| XP de participar en tiempo real (no solo al cerrar jornada) | ✅ | Cambiado 2026-09-15 a petición del usuario ("en dev aunque ponga predicciones no sube nada la barra de nivel"): `XpService.awardParticipation` concede +5 XP al momento en `PredictionsService.submit`, la primera vez que se pronostica cada partido (no en ediciones posteriores del mismo pronóstico) — antes era un flat +5 por jornada, solo al cerrarla de verdad (mismo punto que insignias, necesitaba resultados reales). Si eso cruza de nivel, dispara `notifyLevelUp` igual que el resto de fuentes. |
| Sistema de referidos (link único, registro invitado↔invitador) | ✅ web | **Implementado el 2026-09-16** a petición explícita del usuario, sobre los requisitos fijados el mismo día (ver `decisions.md`). `User.referralCode` (único, mismo formato que `Group.inviteCode` — compartido vía `common/short-code.util.ts`) y `User.referredById` (relación permanente, pensada para que Sprint 11 la consulte sin rediseño). `ReferralsService.redeem` es el único punto de enlace: mismo resultado por link (`/r/:code`, `referralLinkGuard`) o por el campo manual de Ajustes (deliberadamente sin card ni icono). Enlazado al registro (email y Google, solo cuentas nuevas) de forma best-effort. XP del referidor revisada por el usuario en esta misma sesión: 500 en el primero, cae a la mitad en cada uno siguiente hasta un suelo de 10 (`xpForReferral`), sin límite de redenciones por código. De paso, a la misma petición, revisados también `PERFECT_MATCHDAY_1X2`/`PERFECT_MATCHDAY_EXACT` (130/150 → 600, unificados como "pleno de ganadores") y añadido `PERFECT_MATCHDAY_ALL_EXACT` (1000, nuevo — pleno con el marcador exacto de *todos* los partidos, no solo el ganador). Verificado en navegador de extremo a extremo con dos cuentas reales (código copiado de una, aplicado desde Ajustes en la otra: relación y XP confirmadas en Postgres, bloqueo de "ya tienes un referidor" probado). 281 tests del backend y 17 del frontend en verde. Sin decidir/implementar todavía: mecanismo de descuento de Premium en sí (Sprint 11), y sin verificar en iOS/Android (solo web/local). **Actualización el mismo día**: a petición explícita del usuario ("debajo de normas y permisos salga Invitar y ahí dentro esté todo esto del link visible"), el link/código propio pasó de solo compartirse (sin verse en pantalla) a tener su propia pantalla `/profile/invite` (código grande, link visible con copiar, contador de referidos, y el campo de aplicar código de un amigo, que se traslada aquí desde el sitio poco visible del perfil). Nueva entrada "Invitar" en Ajustes, justo debajo de "Normas y premios". La tarjeta "Invita a un amigo" de `/profile/level` no cambia (sigue compartiendo directo). |
| XP por entrar cada día | ⬜ | Sin empezar — no estaba en la lista de prioridad que dio el usuario, era solo un ejemplo del diseño de Claude Design; decidir si se implementa de verdad. |
| Desbloqueables: colores/avatares por nivel | ✅ | `LEVEL_REWARDS` (`level-progress.domain.ts`) ya no es un catálogo inventado: son 18 entradas reales (7 colores de `AVATAR_BACKGROUNDS` + 11 mascotas de `DEFAULT_MASCOT_IDS`, excluyendo el champán/`reposo` "de fábrica"), alternando color/mascota, ordenadas de más sobrio a más vistoso a criterio de Claude Code (a petición explícita del usuario, "según tu criterio"), con la miniatura PNG real de cada mascota. Gating real ya implementado (2026-09-15): `UsersService.updateAvatar` rechaza en servidor (403) un color/mascota de un nivel todavía no alcanzado (`avatar-level-rewards.ts`, mismo mapeo duplicado del frontend), y `/profile/avatar` ya no deja seleccionarlo (candado + atenuado, mismo patrón que las mascotas de trofeo). |
| Aviso de subida de nivel (push + in-app) | ✅ web | Nuevo `NotificationType.LEVEL_UP` (preferencia `levelUp`, activada por defecto), disparado desde `JobsService` justo después de `XpService.evaluateAfterMatchdayClose` (que ahora devuelve qué usuarios cruzaron de nivel en esa pasada). Si la app está abierta en ese momento, un `setInterval` de 2 min en `ShellFacade` detecta el aviso sin leer y abre un pop-up de "¡Subiste de nivel!" una sola vez por sesión (`NotificationsFeedService.pendingLevelUpPopup`); si no, queda como notificación push normal, configurable desde Ajustes de notificaciones. |
| Puntito rojo de nivel sin reclamar (mismo patrón que Jornada) | ✅ web | Mismo estilo `.pending-dot` que ya usan Jornada/Grupos en la barra inferior, reutilizado en 4 sitios: pestaña Perfil de la barra inferior, el nodo concreto del recorrido de nivel, el icono de la tarjeta de detalle, y (2026-09-15, a petición explícita del usuario) el propio color/mascota dentro de `/profile/avatar` (`ProfileAvatarFacade.isMascotNew`/`isBackgroundNew`) — los cuatro leen `NotificationsFeedService.unreadLevelUps()`. La campanita de arriba usa su contador de avisos sin leer ya existente (sin campo nuevo). |
| Marcar un aviso como leído individualmente (no solo "Leer todo") | ✅ | Primera vez en el código que existe esto: `NotificationsService.markOneRead` + `POST /notifications/me/:id/read`. Pulsar el aviso de subida de nivel (desde el pop-up, la campanita o el propio recorrido) navega a `/profile/avatar` y marca leído ese aviso concreto, lo que apaga su puntito rojo en todos los sitios de la fila anterior a la vez (misma señal derivada). |
| Marcos de foto por nivel | 🔒 | El concepto de "marco" no existe todavía en absoluto (mismo hueco pendiente que Sprint 11 Premium) — diseñar desde cero cuando toque. |
| Barra de progreso de nivel en Perfil | ✅ web | Tarjeta con nivel y XP real (`ProfileController` → `xp: xpProgressForLevel(...)`), pulsable a `/profile/level`. |
| Pantalla de progreso de nivel (scroll horizontal) | ✅ web | Track tipo pase de temporada: NIVEL+RECOMPENSA — barra — NIVEL+RECOMPENSA — barra... (`scroll-snap` CSS, sin librería), centrado en el nivel real al abrir. Diseñada visualmente en Claude Design (ver nota de abajo) e implementada en Angular a partir de ese diseño, con los tokens de color reales de Piqo. **2026-09-16, a petición explícita del usuario ("completarlo al 100% con datos reales")**: quitado el aviso "vista de demostración parcial" (ya no aplicaba, las recompensas llevaban un día siendo reales) y sustituidas las 3 últimas piezas fijas de la pantalla por datos reales — `ProfileController` (`GET /users/me/profile`) devuelve ahora también `xpLast7Days` (suma de `XpEvent.amount` de los últimos 7 días), `accuracy` (aciertos/predicciones puntuadas del usuario en todos sus grupos) y `badgesUnlocked` (insignias distintas conseguidas sobre el total del catálogo). La tarjeta "Tu jornada" pasa de Aciertos/Racha/Ranking de muestra a Aciertos/Racha (racha global ya real, existía en la respuesta y no se usaba)/Insignias, todas reales; el "+340 Últimos 7 días" del héroe pasa a `xpLast7Days` real. La tarjeta "Invita a un amigo" (funcionalidad todavía sin construir, ver fila "Sistema de referidos" arriba) dejó de prometer "+100 XP con su primer pronóstico" — ahora muestra un chip "PRONTO" sin comprometer una cifra que no está decidida. Verificado en navegador con una cuenta real de desarrollo con historial (`demo-tu@piqo.test`: 9/21 aciertos, racha x3, 3/20 insignias, +20 XP últimos 7 días — coincide exactamente con lo consultado directamente en Postgres). 261 tests del backend y 17 del frontend en verde. |
| Botón de info (qué XP da cada acción) | ✅ web | Bottom sheet "Cómo ganar XP" (`LevelInfoSheetComponent`) — ya usa los valores/fuentes reales de XP (tabla de arriba) y marca "Invitar a un amigo" como grupo aparte "PRÓXIMAMENTE" sin cifra concreta (`level-progress.domain.ts`, `XP_GROUPS`). Esta fila seguía marcada como pendiente en el roadmap por un despiste de documentación — el contenido real ya estaba así antes de esta sesión (2026-09-16); corregido aquí solo el registro, no el código. |
| Insignia de nivel sobre el avatar en todos los sitios | ✅ web | `AvatarComponent` con `[level]` opcional (insignia circular abajo-derecha, para no chocar con el punto rojo de pendientes). Conectado en los 9 sitios que ya usaban `app-avatar`: top-bar, Perfil, Tabla, miembros de grupo, invitar, resultados de jornada (propios y ajenos), detalle de miembro — para "otros" usuarios el nivel viaja en la misma respuesta que ya traía su avatar (`GroupsService.listMembers`, `RankingsService`, `PredictionsService.getGroupPredictionsForMatchday`, `MemberProfileService`), sin round-trips nuevos. |

**Diseño de la pantalla de nivel encargado a Claude Design** (2026-09-15):
proyecto "Pantalla de progreso Piqo" (`DesignSync`, tras autorizar con
`/design-login`). Alcance acotado explícitamente a esa vista concreta,
no al resto de la app — el resto de la implementación (backend, lógica,
resto de UI) la hizo Claude Code a partir del `.dc.html` exportado,
traduciendo los estilos a los tokens reales de Piqo (`--p4-*`) en vez
de los hex fijos del diseño, para que respete claro/oscuro.

---

## Infraestructura — entorno dev/pre (fuera de la numeración de sprints)

Pedido por el usuario el 2026-09-10, no forma parte del encargo de
producto original: un entorno en `dev.acerton.app` para que un compañero
pruebe cambios antes de que lleguen a producción, con el acceso limitado
de alguna forma. No bloquea ningún sprint de producto ni depende de
ellos — se puede hacer en paralelo, cuando encaje (p. ej. en un hueco
entre sprints, o cuando haya una tanda de cambios grande que merezca
probarse antes de tocar prod).

### Coste real (confirmado, no estimado a ciegas)

- **Frontend (Cloudflare Pages)**: gratis. El plan free admite dominios
  personalizados en ramas/proyectos adicionales sin coste — no hay cargo
  extra por añadir `dev.acerton.app`.
- **Base de datos**: la producción **ya vive en Neon** (proyecto
  `acerton`, org `Marc`, plan free — confirmado con las herramientas de
  Neon en esta sesión, no es una suposición), no en Render. Neon usa
  ramas copy-on-write: crear una rama `dev` a partir de la rama
  `production` no duplica el almacenamiento y es, en la práctica, gratis
  dentro del plan free (el compute de la rama escala a cero cuando nadie
  la usa: `suspend_timeout_seconds: 0` en la config del proyecto).
  Cuidado: `neon.ts` en la raíz del repo ya tiene una política de ramas
  que **auto-expira a los 7 días** cualquier rama nueva que no sea la
  default — hay que añadir una excepción explícita para que la rama
  `dev` no desaparezca sola.
- **Backend (Render)**: aquí está la única partida con coste real.
  Producción corre hoy en el plan free (se duerme — el propio README ya lo
  menciona). Confirmado por búsqueda directa (2026-09-10): el plan
  **Starter** (siempre activo, sin dormirse) cuesta **7 $/mes** (512 MB
  RAM, 0.5 CPU). Cada workspace tiene además 750 horas gratuitas de
  instancia al mes compartidas entre todos los servicios free de la
  cuenta — si producción pasa a Starter (de pago, no consume de ese cupo)
  y dev se queda en el plan free, no hay riesgo de que se compartan
  horas entre ambos.
- **Dominio/DNS**: gratis, es un subdominio del dominio que ya tienen.
- **Limitar el acceso**: ✅ **hecho el 2026-09-16** — **Cloudflare
  Access** (parte de Cloudflare Zero Trust, plan Free activado, hasta 50
  usuarios, $0/mes) configurado delante de **`app-dev.piqo.es`** (nombre
  real tras la migración de dominio a piqo.es — este documento decía
  `dev.acerton.app`, desactualizado). Política "Equipo Piqo dev" (Allow)
  con los emails del usuario y su compañero, login por código de un solo
  uso. Verificado en vivo: la pantalla de login de Cloudflare Access sale
  antes de servir nada de la app. Ver `state.md` para el detalle completo.

**Decisión (aprobada por el usuario el 2026-09-10, ver `decisions.md`)**:
producción pasa a Render Starter (~7 $/mes, dentro del tope de 10 €/mes
puesto por el usuario), dev se queda en el plan free (se duerme, sin
coste). **Coste total esperado: ~7 $/mes** (solo producción), dev a 0€.

### Plan concreto

1. ✅ **Neon — hecho el 2026-09-10**: rama `dev` creada a partir de
   `production` (`br-misty-pond-za5lnxwp`, parent `br-small-lake-zatnhupb`).
   Purgados `users` y `groups` (cascada: memberships, predicciones,
   rachas, insignias de usuario, snapshots de clasificación) — verificado
   a 0 filas tras el borrado. Catálogo intacto: 7 competiciones, 27
   jornadas, 329 partidos, 5 insignias — la base para que quien pruebe
   dev se registre y cree sus propios grupos de prueba con partidos
   reales ya cargados, sin ver ningún dato de usuarios de producción.
   Producción verificada intacta después (16 usuarios siguen ahí). La
   rama no tiene fecha de expiración (`expires_at: null`); no se pudo
   marcar además como "protected" porque el plan free de Neon solo
   permite una rama protegida y `production` ya ocupa ese hueco — sin
   protección extra, la rama es igualmente borrable a mano, pero no
   expira sola. `neon.ts` actualizado con una excepción explícita para
   que una futura recreación por `neon checkout dev` tampoco la haga
   expirar a los 7 días.
   **Connection string entregada al usuario directamente en el chat**, no
   guardada en este repo (contiene una contraseña) — la necesitará para
   el paso 3 (variables de entorno del backend de dev en Render).
2. **Render — producción**: subir el Web Service existente de producción
   del plan free a **Starter** (7 $/mes).
3. **Render — dev**: nuevo Web Service (plan free, se duerme — aceptado)
   desplegado desde la rama `dev` del repo, con `DATABASE_URL`/`DIRECT_URL`
   apuntando a la rama Neon `dev`, `CORS_ORIGIN=https://dev.acerton.app`, y
   secretos JWT propios (no reutilizar los de producción). Nombre sugerido:
   `api-dev.acerton.app`.
4. **Frontend**: nueva configuración de build en `angular.json`
   (`environment.dev.ts` con `apiUrl` apuntando al backend de dev) y un
   proyecto/dominio en Cloudflare Pages para la rama `dev` apuntando a
   `dev.acerton.app`.
5. **Cloudflare Access**: aplicación restringida a los dos emails
   decididos (el usuario + su compañero — ver `decisions.md`), delante de
   `dev.acerton.app`.
6. Documentar en `README.md` del repo cómo desplegar a dev (probablemente:
   push a la rama `dev` → Cloudflare Pages y Render lo recogen solos, igual
   que ya pasa con `main`).

Todos los pasos salvo el 1 (Neon, para el que sí hay herramientas
disponibles en esta sesión) necesitan acceso a los paneles de
Cloudflare/Render (o tokens de API) que esta sesión no tenía — solo se ha
podido investigar y documentar, no ejecutar.
