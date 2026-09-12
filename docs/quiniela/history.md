# Historial de sesiones

Se amplía con una entrada nueva por sesión relevante. No se reescriben las
entradas anteriores.

---

## 2026-09-10 — Sprint 0: preparación

**Qué se hizo:**

- Se creó la skill de proyecto `/quiniela` en
  `.claude/skills/quiniela/SKILL.md`, con el comportamiento de las cinco
  intenciones (vacío, `continuar`, `estado`, `plan`, `cerrar`) descrito en
  el encargo original del usuario.
- Se creó `docs/quiniela/` con los siete documentos: `README.md`,
  `product-rules.md`, `roadmap.md`, `state.md`, `decisions.md`,
  `history.md` (este archivo), `backlog.md`.
- Se creó `CLAUDE.md` en la raíz del repo (no existía ninguno antes) con
  una referencia breve a esta skill, pidiendo a futuras sesiones que lean
  `docs/quiniela/state.md` al empezar y lo actualicen tras cambios
  relacionados, sin forzar implementación automática cuando el usuario
  pida otra cosa.
- Se contrastó el código real contra las reglas de producto del encargo,
  leyendo directamente: `backend/prisma/schema.prisma`,
  `backend/src/groups/groups.controller.ts`,
  `backend/src/badges/badges.service.ts`, y varios componentes de
  frontend (`current-matchday`, `group-list`, `group-detail`,
  `profile-page`). Los hallazgos concretos están en `decisions.md`; las
  preguntas que abren, en `backlog.md`.

**Pruebas ejecutadas:** ninguna — no se ha tocado código de producto en
esta sesión, solo documentación y configuración de la skill.

**Migraciones:** ninguna realizada ni pendiente todavía. Varias tareas
futuras (Sprints 3, 5, 6, 8, 9) necesitarán migraciones de schema nuevas;
se han identificado en `decisions.md`/`backlog.md` pero no diseñado en
detalle.

**Bloqueos/preguntas dejadas abiertas:** ver `backlog.md` — resumen en
`state.md`.

**Siguiente paso:** empezar el Sprint 1 (interfaz de juego) por las tareas
de menor riesgo (textos, quitar fondo, etiquetas L/V) antes de las que
tocan estado de guardado/condiciones de carrera. Detalle exacto con rutas
de archivo en `state.md`.

**Cambios sin commit:** sí — toda la skill y documentación de esta sesión
está sin commitear (no se pidió autorización para hacerlo en esta sesión).

---

## 2026-09-10 — Sprint 1 (interfaz de juego) + infraestructura dev/pre

**Qué se hizo:**

- Sprint 1 completo (10/10 tareas de `roadmap.md`), con varias rondas de
  iteración pedidas directamente por el usuario tras verlas funcionar:
  - Textos "La jornada se abre/cierra en", sin fondo en "Faltan X por
    enviar", confirmación "Copiado" solo si la copia funciona, modal de
    confirmación al cerrar sesión (reutilizando `ConfirmDialogComponent`).
  - Selección 1X2: de spinner/tick a un efecto de contorno animado (SVG
    `<rect>` con `pathLength`) que traza el borde empezando arriba y
    avanzando hacia la derecha; la duración del trazo la marca la
    petición de red real (no un tiempo fijo) y el relleno verde de fondo
    solo llega tras la confirmación real del servidor. Protección contra
    respuestas de red fuera de orden (`requestSeq`) y estado de error
    visible conservando la selección.
  - Resultado exacto: los dos inputs (L/V) pasan a ser una sola caja con
    un único borde, reciben el mismo efecto de contorno (sin relleno de
    fondo), y las etiquetas L/V se muestran una vez como cabecera de
    columna en vez de repetirse por fila.
  - Corregido un bug pre-existente (no parte de las tareas del sprint):
    el estado de guardado de un partido se quedaba visible al cambiar de
    grupo activo cuando dos grupos comparten el mismo partido.
  - Ajustado el presupuesto de estilos de Angular (`angular.json`,
    `anyComponentStyle`) de 3kB/6kB a 4kB/10kB — ya iba al límite antes
    de este sprint.
- Verificado todo con un navegador real (skill `browser-automation`, no
  solo build): registro de cuenta de prueba, unión a grupos reales de la
  base de datos local, interacción real con los controles, lectura de
  estilos/atributos computados en varios instantes (incluso con
  peticiones de red retardadas artificialmente para separar las fases del
  efecto).
- **Infraestructura dev/pre** (fuera de la numeración de sprints, pedida
  directamente por el usuario): investigado y confirmado el coste real
  (Render Starter para producción ≈7$/mes, dev en plan free; Neon ya es
  la base de datos de producción, ramas casi gratis). Decisiones
  aprobadas por el usuario: producción a Starter, dev a free; datos de
  prueba en dev (no copia de producción); acceso solo para el usuario y
  su compañero.
  - Ejecutado: rama `dev` de Neon creada a partir de `production`
    (`br-misty-pond-za5lnxwp`), purgada de datos reales de usuario (16
    cuentas/9 grupos/374 predicciones borrados solo ahí, con confirmación
    explícita del usuario tras el bloqueo automático del sistema por ser
    una acción destructiva), catálogo intacto (competiciones/partidos/
    insignias). `neon.ts` actualizado para que esa rama no auto-expire.
  - Añadida una configuración de build "dev" propia en el frontend
    (`environment.dev.ts`, configuración `dev` en `angular.json`, script
    `build:dev`) apuntando a `https://api-dev.acerton.app/api` — hacía
    falta porque el build por defecto de Angular usa la configuración de
    producción, y sin esto el login de Google en `dev.acerton.app`
    redirigía y autenticaba contra producción.
  - Acompañado al usuario en tiempo real por la configuración manual en
    los paneles de Cloudflare Pages y Google Cloud Console (sin acceso
    directo a esos paneles desde esta sesión): Web Service de Render,
    proyecto de Cloudflare Pages con rama de producción `dev`, dominio
    personalizado `dev.acerton.app`, redirect URI de Google OAuth para el
    backend de dev.

**Pruebas ejecutadas:** build de producción (`npm run build`) verificado
tras cada cambio relevante; verificación funcional en navegador real
(Chromium headless) de las 10 tareas del Sprint 1 y del bug corregido;
build de la configuración `dev` del frontend verificado con
`npm run build:dev`, confirmando por inspección del bundle generado que
`apiUrl` apunta a `api-dev.acerton.app` y no a producción.

**Migraciones:** ninguna de schema. Sí se creó y limpió una rama de base
de datos completa (Neon `dev`) — ver detalle arriba y en `decisions.md`.

**Bloqueos/preguntas dejadas abiertas:** ver `backlog.md`. Resumen: el
entorno dev/pre todavía necesita que el usuario complete la configuración
de Render (subir producción a Starter, crear el Web Service de dev) y
Cloudflare (Custom domain, build command `npm run build:dev`) — en curso
al cerrar esta sesión, con parte de los pasos ya completados por el
usuario en tiempo real durante la conversación.

**Siguiente paso:** confirmar que `dev.acerton.app` autentica ya contra
`api-dev.acerton.app` tras el cambio de build command y el redeploy en
Cloudflare Pages; si funciona, Sprint 1 y la puesta en marcha de dev/pre
quedan cerrados y se puede pasar al Sprint 2 (grupos y navegación). Ver
`state.md` para el detalle de archivos y líneas del primer paso del
Sprint 2.

**Cambios sin commit:** no — todo lo de esta entrada se commitea en esta
misma sesión, a petición explícita del usuario ("sí, súbelo"), a la rama
`dev`.

---

## 2026-09-12 — Reconciliación tras sesión de rediseño visual (sin implementación nueva de roadmap)

**Qué se hizo:**

- El usuario pidió continuar con los sprints de GitHub, señalando que
  "se han implementado muchas cosas nuevas" desde el 2026-09-10. Se siguió
  el protocolo de `/quiniela continuar` paso 2 ("comprobar rama y cambios
  locales, sin asumir que coincide con lo anotado"): `git log --since
  2026-09-10` mostró ~50 commits de una sesión de rediseño visual del
  frontend ("Piqo Mobile 4.0" → "Piqo App 4.1") hecha **fuera** de esta
  skill, en la misma rama `dev`.
- Se leyó ese trabajo contra `roadmap.md` para distinguir presentación
  pura de cambios que sí tocan reglas de producto ya descritas en el
  roadmap. Resultado: casi todo es reconstrucción visual sin relación con
  `product-rules.md` (tokens de diseño, animaciones, reestructuración de
  pantallas de Avisos/Histórico/Normas y premios, vitrina de trofeos con
  años y resumen de temporada explícitamente de muestra, toggles de
  Ajustes de grupo, icono de Unirse a un grupo, página de error de
  muestra) — pero dos piezas sí resuelven tareas concretas ya descritas
  como pendientes:
  - Sprint 7: el input de nombre bloqueado ahora muestra el nombre actual
    deshabilitado en vez de ocultarse (antes 🟡, detalle pendiente
    explícito en `roadmap.md` e issue #12).
  - Sprint 8: nuevo `GET /badges/stats` + `BadgeDetailDialogComponent`
    dan el popup de insignia con % real de usuarios registrados que la
    tienen, deduplicado por usuario (antes ⬜ en `roadmap.md` e issue #13).
- Actualizado `roadmap.md` (ambas filas a ✅ web, con detalle técnico) y
  `state.md` (sección nueva "Reconciliación 2026-09-12").
- GitHub: marcadas las casillas correspondientes en los issues #12 y #13
  (`gh issue edit`). Ninguno de los dos sprints queda completo con esto —
  ambos issues siguen en Status "New features" (regla de la skill: solo se
  mueve a "Test" cuando el issue queda completo).
- No se ha implementado ningún incremento nuevo de roadmap en esta
  entrada — es una reconciliación de estado, no un `continuar` con
  desarrollo. Se ha dejado preguntado al usuario si prefiere (a) mergear
  a `main` el trabajo de Sprint 3/4/5 ya pendiente de confirmación desde
  el 2026-09-10, o (b) seguir con el siguiente incremento de Sprint 5 o
  con el resto de Sprint 8, antes de tocar código.

**Pruebas ejecutadas:** ninguna nueva — se confirmó por lectura de código
(no solo por commit) que ambos detalles siguen presentes en el estado
actual de `dev` (`profile-page.component.html` línea ~93,
`badges.controller.ts`/`badges.service.ts`, `badge-detail-dialog.
component.ts`).

**Migraciones:** ninguna.

**Bloqueos/preguntas dejadas abiertas:** cuál de las dos rutas (merge a
`main` vs. seguir implementando) prefiere el usuario — ver `state.md`
"Siguiente paso concreto".

**Siguiente paso:** el que decida el usuario entre las dos opciones
anteriores. Si elige seguir implementando, los candidatos con detalle ya
descrito en `roadmap.md` son: Sprint 5 (orden estable de jornadas —
pendiente de investigación con datos reales; o estadísticas agregadas por
temporada) y Sprint 8 (alcance global de insignias, catálogo ampliado,
favoritas, progreso numérico).

**Cambios sin commit:** los documentos de esta reconciliación
(`roadmap.md`, `state.md`, `history.md`) se han editado en esta sesión;
pendiente de commit/push explícito si el usuario lo pide (esta skill no
commitea sin autorización, ver regla general).

---

## 2026-09-12 (continuación) — Sprint 9, incremento 1: preferencias de notificación

**Qué se hizo:**

- El usuario pidió seguir con los sprints de GitHub tras la reconciliación
  del bloque anterior; se le preguntó si quería mergear a `main` el
  trabajo pendiente del Sprint 5 o seguir implementando, y eligió seguir
  implementando. Entre Sprint 5 (estadísticas por temporada) y Sprint 8, el
  usuario pidió expresamente ir por Sprint 9 (Notificaciones).
- Antes de tocar código, surgió una ambigüedad real en Sprint 5 (qué
  significa "temporada" en la vista GLOBAL cuando las temporadas son por
  grupo) — se dejó sin resolver y sin implementar nada de Sprint 5 en esta
  entrada; el usuario redirigió a Sprint 9 en su lugar.
- Se creó la rama `feature/sprint-9-notificaciones` a partir de `dev` (con
  autorización explícita del usuario: "subimos esto a dev y creamos una
  rama a partir de dev", y luego "Sprint 5 — Estadísticas por temporada"
  primero, corregido después a Sprint 9 antes de escribir código).
- Leído `product-rules.md` § "Notificaciones" en detalle antes de diseñar
  nada. Alcance del incremento 1, decidido por tamaño (igual que se hizo
  con el Sprint 5): todo lo que se puede construir sin un disparador nuevo
  en `jobs.service.ts` y sin depender de sprints no implementados.
- **Backend**:
  - Migración `add_notification_preferences_and_mute`: modelo
    `NotificationPreference` (1:1 con `User`, creado de forma perezosa,
    mismo patrón que `GlobalStreak`), `GroupMembership.mutedNotifications`,
    `Matchday.reminder24hSentAt`. Aplicada contra la base de datos real de
    desarrollo (Postgres local en Docker) sin tocar producción.
  - `NotificationPreferencesService`/`NotificationPreferencesController`
    (`GET`/`PATCH /users/me/notification-preferences`, incluye la lista de
    grupos propios con su estado de silencio).
  - `GroupsService.setMuted` + `PATCH /groups/:id/mute` (cualquier
    miembro, no requiere ser admin — es su propia preferencia).
  - `NotificationsService`: nuevo `filterByPreference` (descarta grupo
    silenciado + preferencia de cuenta desactivada) aplicado a
    `notifyMatchdayClosingSoon` (ahora recibe la franja como parámetro) y
    `notifyMatchdayFinished` (ahora incluye la posición real del usuario,
    vía `getPositionForUser`, mismo criterio de alcance general/por
    competición que `GroupsService.findMineForUser`). Nuevo
    `notifyBadgeEarned`, filtrado solo por preferencia de cuenta (no por
    grupo silenciado, documentado el motivo en el código).
  - `BadgesService.award` cambiado de `upsert` a comprobar existencia +
    `create`, para poder distinguir "ya la tenía" de "recién concedida";
    `evaluateAfterMatchdayClose` devuelve ahora las insignias nuevas de esa
    pasada, y `JobsService.badgesEvaluateAndNotify` las usa para avisar
    solo de logros genuinamente nuevos.
  - `JobsService.REMINDER_TIERS` ampliado a 4 franjas (24h/5h/1h/30min),
    cada una con su propia preferencia.
- **Frontend**: `NotificationPreferencesService`/`GroupsService.setMuted`
  (Angular), pantalla `/notifications/preferences` (facade + componente),
  enlazada desde Perfil junto a "Avisos", con tres secciones `<details>`
  plegables (Jornadas, Actividad, Grupos silenciados) y actualización
  optimista con reversión si falla la petición.
- **Pruebas ejecutadas**: `npx jest` completo del backend (138 tests, 16
  suites) tras los cambios — todo verde, incluidos 10 tests
  nuevos/actualizados (`notifications.service.spec.ts`:
  filtrado por preferencia, por grupo silenciado, posición incluida,
  insignia conseguida con/sin preferencia; `jobs.service.spec.ts`: mock de
  `evaluateAfterMatchdayClose` actualizado a su nueva forma, nuevo test de
  `sendClosingReminders` que confirma la franja de 24h con su preferencia
  correcta). `npx tsc --noEmit` sin errores. `ng build` (dev y producción)
  sin errores nuevos. Verificado además en vivo: backend reiniciado con
  Prisma Client regenerado (fue necesario matar los procesos de
  `nest start --watch` que tenían bloqueado el binario nativo antes de
  poder regenerar), smoke test por API directa (registro de cuenta QA,
  `GET`/`PATCH` de preferencias, creación de grupo + mute) y verificación
  visual completa en navegador real (Chromium vía la extensión Claude in
  Chrome): toggles, persistencia tras recargar, mute en rojo. Cuentas y
  grupos de prueba borrados al terminar, en transacciones explícitas
  (`BEGIN`/verificar/`COMMIT`), sin tocar datos reales.

**Migraciones:** `20260911223212_add_notification_preferences_and_mute`,
aditiva (sin pérdida de datos), aplicada contra la base de datos local de
desarrollo. Pendiente aplicarla contra `dev`/`main` cuando se fusione la
rama.

**Bloqueos/preguntas dejadas abiertas:** ninguna nueva sobre Sprint 9 en sí
— las tareas que quedan pendientes son trabajo no empezado, no ambigüedad
de producto (ver `roadmap.md` Sprint 9 para el detalle de cada una). Sigue
abierta la pregunta de Sprint 5 sobre qué significa "temporada" en la
vista global (sin resolver, sin bloquear nada porque no se ha tocado
Sprint 5 en esta entrada).

**Siguiente paso:** decisión del usuario — fusionar
`feature/sprint-9-notificaciones` a `dev` (y aplicar la regla de
Seguimiento en GitHub al hacerlo) o seguir añadiendo incrementos en la
misma rama antes de subirla. Ver `state.md` para el resto de decisiones
pendientes (merge a `main` del Sprint 3/4/5).

**Cambios sin commit:** no en la rama `feature/sprint-9-notificaciones`
(todo commiteado y empujado); los documentos de esta entrada
(`roadmap.md`, `state.md`, `history.md`) se han editado en esta misma
sesión, pendientes de commit en esa rama.

---

## 2026-09-12 (continuación) — Sprint 7, incremento 1 de avatares: catálogo de mascota + color

**Qué se hizo:**

- El usuario pidió empezar el tema de avatares del Sprint 7, aportando de
  entrada la especificación exacta: colores de fondo a elegir, 13
  imágenes de la mascota "Piqo" (carpeta `C:\Users\34655\Downloads\
  piqopetimg`, 10 numeradas + 3 sueltas), y la posibilidad de elegir una
  foto del carrete o la mascota con el fondo que se quiera.
- Antes de escribir código: se inspeccionaron las 13 imágenes (dimensiones
  muy dispares, 408×726 a 1254×1254, 1-1.6 MB cada una, fondo
  transparente) y se comprobó que no existe ninguna infraestructura de
  subida/almacenamiento de imágenes en el backend (sin `multer`, sin
  S3/Cloudinary, Render sin disco persistente utilizable). Se decidió
  dividir el trabajo: catálogo cerrado (mascota + color, sin dependencias
  de infraestructura nueva) ahora; subida de foto propia aparte, bloqueada
  hasta decidir proveedor de almacenamiento con el usuario (anotado en
  `backlog.md`, no resuelto en esta sesión).
- **Procesado de las 13 imágenes** con `sharp` (recorte de márgenes
  transparentes, centrado y reescalado a 512×512 con la misma altura de
  personaje en las 13 para que se vean uniformes en una rejilla, PNG
  paletizado): de 1-1.6 MB a 55-68 KB cada una. Publicadas en
  `frontend/public/assets/avatars/mascot/<id>.png` (no en `src/assets/`,
  que no forma parte de los `assets` de `angular.json` — detectado porque
  las imágenes daban 404 en el primer intento, con el input real siendo
  `public/`).
- **Backend**: `User.avatarBackground` (migración
  `add_avatar_background`), catálogo cerrado en
  `src/users/avatar-catalog.ts` (13 ids de mascota + 8 colores curados a
  juego con la marca, ninguno de los tokens semánticos `--p4-*` para no
  mezclar significado funcional con personalización), `UpdateAvatarDto`
  validado con `class-validator` `@IsIn` contra ese catálogo cerrado (no
  se aceptan URLs ni colores libres, justo porque no hay subida de foto
  todavía), `GET /users/me/avatar-catalog` + `PATCH /users/me/avatar`,
  `UsersService.updateAvatar`. `AuthService.register` asigna mascota y
  color aleatorios sin ningún paso extra (`randomCatalogAvatar`); las
  cuentas de Google no lo necesitan, ya llegan con su foto real.
  `PublicUser`/`toPublicUser` ampliados con `avatarBackground`.
- **Frontend**: modelos y servicio (`ProfileService.getAvatarCatalog`/
  `updateAvatar`), componente compartido `app-avatar` (foto/mascota sobre
  su color, o iniciales si no hay nada elegido) para no repetir esa
  lógica en cada pantalla — sustituye el markup ad-hoc de `top-bar` y
  añade la primera vez que Perfil respeta `avatarUrl` (antes siempre
  mostraba iniciales, ignorando cualquier avatar guardado). Nueva pantalla
  `/profile/avatar`: vista previa en vivo, swatches de color, rejilla de
  13 mascotas, una casilla "Subir foto (próximamente)" visible pero
  deshabilitada para no prometer algo que no existe todavía, botón
  "Guardar avatar" deshabilitado sin cambios.
- **Pruebas ejecutadas**: `npx tsc --noEmit` y `npx jest` completos del
  backend en verde (139/139, 1 test nuevo de `updateAvatar`). `ng build`
  (dev) sin errores. Verificado en vivo: backend reiniciado tras
  regenerar Prisma Client (mismo bloqueo del binario nativo que en la
  entrada anterior, mismos pasos para resolverlo), smoke test por API
  directa (catálogo, guardar avatar, rechazo de valores fuera del
  catálogo con 400, registro con asignación automática), y verificación
  visual completa en navegador real: seleccionar mascota/color actualiza
  la vista previa, guardar persiste y se refleja en Perfil y en la
  cabecera tras volver/recargar. Un susto sin bug real: las 13 mascotas
  parecían idénticas en la rejilla a simple vista en una captura
  comprimida — se confirmó con un hash de píxeles por `canvas` en la
  propia página que las 13 imágenes son distintas de verdad (mismo
  personaje y paleta de color, poses sutilmente distintas a tamaño de
  miniatura). **Aparte, sin relación con el encargo**: al ir a probar con
  la cuenta real del usuario, Chrome autorellenó el formulario de login
  con su email y contraseña reales guardados — no se usaron ni se
  revelaron, se limpiaron los campos y se continuó con una cuenta de
  prueba (`qa-piqo-avatar1@test.local`), luego borrada.
- Reconciliado el frontend dev server: los assets nuevos en `public/`
  necesitaron reiniciar `ng serve` (no basta con el hot-reload normal de
  componentes) para dejar de dar 404 — anotado por si vuelve a pasar con
  assets estáticos nuevos en el futuro.

**Migraciones:** `20260911232322_add_avatar_background`, aditiva (sin
pérdida de datos), aplicada contra la base de datos local de desarrollo.
Pendiente aplicarla contra `dev`/`main` cuando se fusione la rama.

**Bloqueos/preguntas dejadas abiertas:** proveedor de almacenamiento de
imágenes para la subida de foto propia (ver `backlog.md`) — no bloquea el
resto del sprint, solo esa tarea y las que dependen de ella.

**Siguiente paso:** decisión del usuario — fusionar
`feature/sprint-7-avatares` a `dev` (y aplicar la regla de Seguimiento en
GitHub al hacerlo) o seguir añadiendo incrementos en la misma rama; y,
por separado, decidir el proveedor de almacenamiento para poder empezar
la subida de foto propia.

**Cambios sin commit:** no en la rama `feature/sprint-7-avatares` (todo
commiteado y empujado tras esta entrada); los documentos de esta entrada
(`roadmap.md`, `state.md`, `history.md`, `backlog.md`) se han editado en
esta misma sesión, incluidos en el mismo commit.

---

## 2026-09-12 (continuación) — Sprint 8: progreso numérico + barra en insignias

**Qué se hizo:**

- El usuario pidió explícitamente: "los logros, siempre que sea contable y
  posible, se añade una barra de progreso" — tarea ya descrita en
  `product-rules.md`/`roadmap.md` Sprint 8 como pendiente.
- **Backend**: `BADGE_TARGETS` (nuevo, `badges.service.ts`) fija el umbral
  de cada insignia medible del catálogo actual (`STREAK_5`→5,
  `STREAK_10`→10, `HOT_STREAK_5`→5) y se reutiliza tanto en `award()` como
  en el cálculo de progreso, para que ambos no puedan desincronizarse.
  `FIRST_MATCHDAY_PLAYED` y `MATCHDAY_TOP_1` se dejaron fuera a propósito:
  son logros de un solo evento (jugar una jornada, quedar 1º en una
  jornada concreta), no algo medible que se acumule hacia un número — un
  "0/1" no aporta nada que el candado no diga ya. Nuevo
  `BadgesService.getProgressForUser` (mejor racha de grupo entre todos los
  del usuario para STREAK_5/10; mejor racha de aciertos consecutivos más
  recientes, por grupo, para HOT_STREAK_5 — basta con llegar al umbral en
  un grupo para desbloquearla, igual que la concesión real). Nuevo
  `GET /badges/me/progress`. 4 tests unitarios nuevos
  (`badges.service.spec.ts`, no existía antes).
- **Frontend**: `BadgesService.getProgress()`, `BadgeProgress` (modelo
  compartido), barra de progreso (pista + relleno + "N/M") en la pantalla
  de Insignias (`/profile/badges`) y en el popup de detalle
  (`BadgeDetailDialogComponent`, abierto desde la vista previa de 5
  insignias en Perfil) — reutiliza el mismo patrón visual que la barra de
  progreso de jornada ya existente. Solo se muestra para insignias no
  conseguidas con progreso definido.
- **Pruebas ejecutadas**: `npx jest` completo del backend en verde
  (146/146, 4 tests nuevos). `ng build` (dev) sin errores. Verificado en
  vivo: cuenta QA nueva sin grupos → progreso 0/5, 0/10, 0/5 en las tres
  insignias medibles (por API); cuenta QA con una fila de `Streak` real
  insertada a mano (`currentStreak: 3`) → progreso 3/5 y 3/10 correctos,
  confirmado por API y visualmente en navegador real (Chromium): barra de
  progreso parcial rellenada proporcionalmente, "Jornada perfecta" y
  "Primeros pasos" (no medibles) sin barra, tal como se esperaba.

**Migraciones:** ninguna (no se tocó el esquema).

**Bloqueos/preguntas dejadas abiertas:** ninguna nueva.

**Siguiente paso:** el que decida el usuario — quedan en Sprint 8 el
alcance global de insignias (bloqueado por decisión de migración, ver
`backlog.md`), el catálogo ampliado, renombrar "Jornada perfecta",
favoritas, y concesión retroactiva.

**Cambios sin commit:** no tras esta entrada — commiteado en la rama
`feature/sprint-7-avatares` (donde ya estaba trabajando esta sesión) junto
con los otros dos arreglos sueltos de este bloque de mensajes (racha 0 en
Perfil, orden de jornadas por cierre más próximo) — ninguno de los tres es
en realidad parte de Sprint 7, se avisó de esto al usuario.
