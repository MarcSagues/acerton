# Decisiones

Decisiones de producto o técnicas tomadas durante la implementación del
roadmap, con su motivo. Las decisiones sustituidas se marcan como tales
(no se borran, para conservar el porqué de cada cambio de rumbo).

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
