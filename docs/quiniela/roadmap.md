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
| Formulario único de creación de grupo | ✅ web | `group-list.component.html`, bottom sheet `sheet-form`: nombre, descripción, modo de puntuación, privacidad, comodín, botón al final — todo en un único paso, sin distinguir cuenta nueva/existente. |
| Selector Público/Privado de dos opciones | ✅ web | Cambiado el checkbox por un selector de dos botones (mismo patrón visual que el de modo de puntuación), con descripción de lo que implica cada opción y nota de que se puede cambiar después. Verificado en navegador: alterna correctamente entre los dos estados. |
| Privado por defecto | ✅ | Confirmado: `isPublic` en Prisma tiene `@default(false)`, y el form de creación arranca con "Privado" marcado. |
| Comodín con resumen + detalle ampliable | ✅ web | Añadido un enlace "¿Cómo funciona el comodín?" (solo visible en modo 1X2) que despliega un párrafo explicando la doble oportunidad y el recálculo semanal según la diferencia de puntos con el líder, coherente con `WildcardsService.getComebackStatus`. Verificado en navegador: se expande y contrae correctamente. |
| Botón "Crear grupo"/"Guardar cambios" al final, no fijo | ✅ (creación) / ✅ (ajustes) | Ya es así en ambos formularios actuales. |
| Guardar deshabilitado sin cambios válidos o con guardado en curso | ✅ | Competiciones ya lo tenía. Añadido el mismo patrón a "Guardar reglas": nuevo `hasRuleChanges` (valor dentro de 1-50 y distinto del actual) — antes se podía guardar sin haber cambiado nada. |
| Rueda de ajustes para acceder | ✅ | Decisión: se mantiene el icono de "sliders" actual (`settings-link`) — cumple el mismo propósito que una rueda literal, cambiarlo sería puramente cosmético y no lo pidió el usuario al revisar el sprint completo. |
| Entrada según nº de grupos (0 → crear/unirse, 1 → Jornada, varios → Grupos) | ✅ web | 0 grupos ya funcionaba (`hasGroupGuard` manda a `/welcome`). Añadido `GroupsService.postLoginRoute()`, usado en los 3 sitios donde se navega tras iniciar sesión (login/registro, Google nativo, callback de Google web): con 1 grupo va a Jornada, con varios a Grupos. Verificado en navegador: registro→0 grupos→`/welcome`; con 2 grupos ya unidos, reingresar lleva a `/groups`. |
| Pulsar un grupo lleva a su Tabla | ✅ web | `goToGroup()` en `group-list.component.ts` navegaba a `/matchday`, ahora navega a `/rankings`. Verificado en navegador. |
| Preview del grupo con posición general del usuario | ✅ web | Backend: `GroupsService.findMineForUser` adjunta ahora `myPosition` (posición + puntos de la última clasificación TOTAL), con el mismo criterio de scope que usa Tabla (competición única vs. general si hay varias activas). Frontend: la tarjeta de grupo muestra "Vas N.º · P pts" en vez del texto genérico cuando ya hay clasificación. Verificado con datos reales (no solo capturas): se comprobó que el endpoint recoge la clasificación más reciente generada por los crons de fondo. Efecto colateral bueno: de paso se corrigió que los chips de competiciones de la tarjeta nunca se mostraban (la consulta no incluía esa relación). |
| Grupo activo diferenciado en el selector | ✅ web | El menú desplegable de `group-switcher` marca ahora el grupo activo en verde con un check, el resto en gris. Verificado en navegador. |
| Respetar destinos de enlaces directos | ✅ web | `authGuard` y `usernameGuard` ahora guardan la URL original como `returnUrl` (query param, o `sessionStorage` para el login de Google en web, que hace una redirección completa fuera de la app) y se vuelve ahí tras iniciar sesión, en los 4 flujos de login (email/password, registro, Google nativo, Google web) y en la confirmación de nombre de cuentas nuevas de Google. Antes, un enlace de invitación pulsado sin sesión iniciada se perdía sin más. Corregido de paso un bug real que rompía esto: `auth-page` renavegaba a `/login` sin conservar query params nada más cargar. Verificado con datos reales: un usuario sin cuenta que entra por un link de invitación acaba siendo miembro real del grupo tras registrarse. **Límite conocido, no cubierto**: si `hasGroupGuard` interrumpe (0 grupos, en una ruta que si lo exige) no se conserva el destino — caso raro, un link a algo de un grupo concreto no tiene mucho sentido sin pertenecer ya a él. |

Validar también: enlaces directos (invitación, deep link) y estados
vacíos (sin grupos, grupo sin competiciones activas).

## Sprint 3 — Roles y membresías 🔒

**Bloqueado por una decisión de modelo de datos**: hoy `GroupRole` solo
tiene `ADMIN` y `MEMBER` (`schema.prisma`) — no existe el concepto de
"creador/propietario" como algo distinto de administrador, ni un campo de
propietario en `Group`. Ver `backlog.md` para la pregunta concreta antes
de tocar schema.

También bloqueado en parte por el borrado de grupo: hoy `Group` tiene
`onDelete: Cascade` hacia `GroupMembership`, `GroupCompetition`,
`Prediction`, `RankingSnapshot`, `Streak` y `UserBadge` — es decir, borrar
un grupo hoy borra físicamente todo su historial, lo contrario de "eliminar
retira de vistas activas, conservando historia y trofeos". Hace falta
introducir borrado lógico (p. ej. `deletedAt` en `Group`) antes de
implementar esta regla. Ver `backlog.md`.

| Tarea | Estado | Notas |
|---|---|---|
| Rol de creador/propietario distinto de admin | 🔒 | No existe. Requiere decisión de schema (ver backlog). |
| Permisos de creador (nombrar/quitar admins, transferir, eliminar) | ⬜ | No hay endpoints: `groups.controller.ts` no tiene `leave`, `kick`, `transfer` ni `delete`. |
| Permisos de admin (editar ajustes, expulsar miembros normales) | 🟡 | Editar ajustes ya existe y respeta `isAdmin()` en frontend (`toggleCompetition`, `toggleComebackEnabled`, etc.) — verificar que el backend también lo exige, no solo el frontend. Expulsar no existe. |
| Admins no pueden expulsar/degradar a otros admins o al creador | ⬜ | No implementado (no existe expulsión todavía). |
| Miembros ven opciones deshabilitadas, no ocultas | 🟡 | Ya es el patrón visual actual en `group-detail` (`class.disabled`) para competiciones/reglas — extender al resto de acciones nuevas. |
| Permisos aplicados en backend, no solo interfaz | ⬜ | A verificar/reforzar caso por caso al añadir cada endpoint nuevo. |
| Salir del grupo con confirmación | ⬜ | No existe endpoint ni UI. |
| Creador debe transferir o eliminar antes de salir | ⬜ | Depende de que exista transferencia y borrado lógico. |
| Eliminar grupo conservando historia y trofeos | 🔒 | Bloqueado por el cascade delete actual — ver arriba. |
| Salir/expulsión conserva resultados | 🟡 | Las predicciones/rachas/insignias cuelgan de `userId`+`groupId` directamente, no de `GroupMembership`, así que borrar la membresía (si se implementa así) no debería arrastrar el historial — a confirmar al implementar. |
| Reincorporación no reinicia fecha de participación | ⬜ | Depende del modelo de temporadas (Sprint 5) para tener algo que "reiniciar o no". |

Probar permisos mediante peticiones directas al backend, no solo a través
de la interfaz.

## Sprint 4 — Tutorial ⬜

No existe ningún componente de tutorial/onboarding de producto hoy (solo
`onboarding/username`, que es para confirmar el nombre de cuentas de
Google, no un tutorial de la app).

| Tarea | Estado | Notas |
|---|---|---|
| Guía breve adaptada al modo (1X2 / resultado exacto) | ⬜ | — |
| Se inicia en la primera entrada a un grupo | ⬜ | — |
| Omitir, finalizar y repetir desde Perfil | ⬜ | — |
| Persistencia por cuenta (no solo dispositivo) | ⬜ | Requiere guardar un flag en el backend (`User` no tiene campo para esto hoy). |
| No obliga a enviar un pronóstico real | ⬜ | — |

Validar: grupos sin partidos disponibles todavía, y pantallas pequeñas.

## Sprint 5 — Temporadas, estadísticas y rachas 🔒

**Bloqueado por modelo de datos**: no existe ningún concepto de
"temporada" en el schema — `Competition.currentSeason` es un único `Int`
por competición, sin historial ni ventana de fechas, y no hay relación
grupo↔temporada. Toda la sección de "Temporadas y participación" de
`product-rules.md` requiere diseño de schema nuevo antes de tocar UI. Ver
`backlog.md`.

| Tarea | Estado | Notas |
|---|---|---|
| Modelo y migración de temporadas | 🔒 | No existe nada que migrar; es diseño desde cero. |
| Añadir competiciones durante la temporada sin retroactividad | 🟡 | El toggle de competiciones activas ya existe (`GroupCompetition.isActive`), pero no hay noción de "desde qué jornada cuenta" ligada a temporada. |
| Elegibilidad de participación (50 %, jornadas ya cerradas al incorporarse) | ⬜ | No existe ningún cálculo de elegibilidad hoy. |
| Racha global (todas las competiciones, deduplicando jornadas repetidas entre grupos) | 🔒 | El modelo `Streak` actual es único por `(userId, groupId)` — no hay agregación entre grupos ni deduplicación de jornadas repetidas. Requiere lógica y probablemente modelo nuevos. |
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

## Sprint 7 — Perfil y avatares

| Tarea | Estado | Notas |
|---|---|---|
| Nombre bloqueado 7 días | 🟡 | Ya implementado en backend y frontend: `User.nameChangedAt`, hint "Ya lo has cambiado..." en `profile-page.component.html`. Falta el detalle nuevo: mostrar el nombre actual **dentro de un input bloqueado** (hoy se oculta el input entero y solo se muestra el texto de aviso). |
| Restricción aplicada en servidor | ✅ | Ya existe (`UsersService.updateName`, según referenciado en el código). |
| Catálogo de avatares predeterminados | ⬜ | Solo existe `User.avatarUrl` como string libre, sin catálogo. |
| Asignación automática al registrarse | ⬜ | — |
| Subida de foto, recorte, previsualización circular | ⬜ | — |
| Sustituir foto o volver a avatar del catálogo | ⬜ | — |
| Validar formato/tamaño y quitar metadatos privados (EXIF, etc.) | ⬜ | — |
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
| Catálogo ampliado (12 insignias propuestas) | ⬜ | Hoy solo hay 5 (`FIRST_MATCHDAY_PLAYED`, `STREAK_5`, `STREAK_10`, `HOT_STREAK_5`, `MATCHDAY_TOP_1`). Faltan condiciones y checkers para las nuevas. |
| Renombrar "Jornada perfecta" → "En lo más alto" | ⬜ | Ver nota de `backlog.md`: la condición actual (`MATCHDAY_TOP_1`) premia empates; el nuevo catálogo la define "en solitario" — decidir cuál se aplica antes de renombrar. |
| Hasta 3 favoritas, solo entre conseguidas | ⬜ | — |
| Favoritas visibles como logos bajo el nombre en Perfil | ⬜ | — |
| Popup con descripción y % de usuarios que la tienen (sobre el total de registrados) | ⬜ | — |
| Progreso numérico + barra cuando sea medible | ⬜ | — |
| Concesión retroactiva cuando los datos lo permitan | ⬜ | A evaluar insignia por insignia qué datos históricos existen. |
| Conservar desbloqueos existentes durante la migración a global | 🔒 | Depende de resolver primero la deduplicación mencionada arriba. |

Probar que el cálculo de progreso y el de desbloqueo usan exactamente la
misma regla (para que no se desincronicen).

## Sprint 9 — Notificaciones

| Tarea | Estado | Notas |
|---|---|---|
| Preferencias por cuenta + silenciar grupo | 🔒 | No existe ningún modelo de preferencias de notificación — solo `NotificationToken` (token de dispositivo). Requiere modelo nuevo. |
| Interfaz desplegable con controles independientes | ⬜ | — |
| Apertura de jornada (activada por defecto) | ⬜ | No se ha visto este evento en `jobs.service.ts` — hoy solo hay recordatorios de cierre y aviso de resultados. |
| Recordatorios 24h/5h/1h/30min, selección múltiple, solo 1h por defecto | 🟡 | Hoy existen 5h/1h/30min fijos para todos (`reminder5hSentAt`/`reminder1hSentAt`/`reminder30mSentAt` en `Matchday`), sin preferencia por usuario y sin la franja de 24h. Cambiar esto a "por usuario y configurable" es un cambio de modelo, no solo de UI. |
| Recordatorios solo si faltan pronósticos | ✅ (probable) | El propio README describe que los recordatorios van "a quien todavía no ha completado su quiniela" — confirmar que se mantiene al añadir preferencias. |
| Partido terminado con puntos (desactivado por defecto) | ⬜ | No existe este tipo de notificación hoy. |
| Jornada terminada con resultado y posición (activada) | 🟡 | El README menciona que al finalizar una jornada se dispara "la notificación de resultados publicados" — a confirmar que incluye posición y que se puede desactivar. |
| Insignia conseguida (activada) | ⬜ | No se ha visto este disparo en `notifications`/`badges`. |
| Temporada terminada y trofeos (activada) | 🔒 | Depende de que exista el concepto de temporada y trofeo (Sprints 5-6). |
| Agrupar mismo partido jugado en varios grupos en un solo aviso | ⬜ | — |
| No duplicar ni reenviar recordatorios antiguos al cambiar preferencias | ⬜ | — |
| No avisar de grupos silenciados o abandonados | ⬜ | — |
| Verificar regularidad del hosting del backend para los crons necesarios | ⬜ | Backend en Render (plan gratuito, se duerme) — ver `backlog.md`, puede no ser sensible a los intervalos actuales pero sí a franjas nuevas más finas (p. ej. 24h en punto para muchos usuarios). No introducir infraestructura de pago sin autorización explícita. |

Validar permisos de notificación y entrega real en las tres plataformas
cuando haya dispositivos y credenciales disponibles.

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
- **Limitar el acceso**: **Cloudflare Access** (parte de Cloudflare Zero
  Trust) tiene un plan free hasta 50 usuarios — de sobra para "mi
  compañero y yo". Deja poner una pantalla de verificación (código por
  email, o login de Google) delante de `dev.acerton.app` antes de que la
  petición llegue siquiera a la aplicación, sin tocar código. Gratis.

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
