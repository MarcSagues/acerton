# Estado actual

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

Pendiente del mismo sprint, en incrementos siguientes: orden estable de
jornadas por cierre de pronósticos (necesita investigación con datos
reales antes de implementar, ver `backlog.md`), estadísticas agregadas
por temporada. Ninguno de los dos se ha tocado desde el 2026-09-10.

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

No en `dev`: todo el trabajo de Sprint 3, Sprint 4, los incrementos 1-3
del Sprint 5, el Sprint 9 (incremento 1), y la sesión de rediseño visual
completa (incluida la reconciliación de este documento) está commiteado y
empujado a `origin/dev`. El incremento 1 de avatares del Sprint 7 está
commiteado y empujado a `origin/feature/sprint-7-avatares`, una rama
aparte que **todavía no se ha fusionado a `dev`** (pendiente de
autorización explícita).
