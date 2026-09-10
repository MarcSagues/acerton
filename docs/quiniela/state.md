# Estado actual

_Última actualización: 2026-09-10 (Sprint 3 y Sprint 4 completos en `dev`,
Sprint 5 con sus tres primeros incrementos (base de temporadas,
elegibilidad, racha global) en `dev` — pendiente de que el usuario los
pruebe antes de mergear a `main`. Sesión todavía abierta, no cerrada con
`/quiniela cerrar`)._

## Sprint activo

**Sprint 1 y 2**: cerrados, mergeados a `main`, confirmados en producción.

**Sprint 3 — Roles y membresías**: completo en `dev`, verificado (17
comprobaciones de permisos por HTTP directo + navegador con dos sesiones
reales). Ver `roadmap.md` Sprint 3. Issue #8 en Status "Test".

**Sprint 4 — Tutorial**: completo en `dev`, verificado en web. Recorrido
guiado tipo "coach mark" (no un modal de texto, corregido tras feedback
explícito del usuario): cada paso resalta el elemento real de la
interfaz con una burbuja anclada junto a él. El paso que señala el botón
"Jornada" del menú inferior avanza solo al detectar que el usuario lo
pulsó de verdad (navegación real vía `Router`), sin botón propio — el
resto de pasos usa "Siguiente"/"Saltar". Adaptado al modo de puntuación
del grupo, persistido por cuenta (`User.tutorialCompletedAt`),
repetible desde Perfil sin resetear el flag. Ver `roadmap.md` Sprint 4.
Issue #9 en Status "Test".

**Sprint 5 — Temporadas, estadísticas y rachas**: **en curso**, primer
incremento (base de temporada) completo en `dev`. Decisión de modelo
tomada con el usuario (ver `decisions.md`): una temporada de grupo
termina cuando se cuenta el último partido de TODAS sus competiciones
activas — no una fecha fija. Se puede dar un preview de cuándo, pero el
cierre es definitivo solo tras el recuento; un aplazamiento recalcula en
vez de cerrar. Implementado: `GroupSeason` (por grupo), detección real de
cierre enganchada al flujo existente de finalización de jornada,
`RankingSnapshot` vinculado a su temporada, etiqueta "Temporada 2026/27"
visible en Tabla. Verificado en vivo contra la base de datos real
(creación automática al puntuar) + 9 tests unitarios de la lógica de
cierre (no se puede provocar un cierre real esta sesión: ninguna liga
termina pronto). Issue #10 actualizado con las casillas hechas, **sigue
en Status "New features"** (el sprint no está completo, solo su primer
incremento — no aplica la regla de mover a Test todavía).

Incremento 2 (completo): elegibilidad de participación (50% inclusive de
jornadas disponibles desde la incorporación, un pronóstico basta por
jornada, deduplicado). `EligibilityService` + `GET /groups/:id/eligibility`
— 8 tests unitarios + verificado en vivo. Base para el mínimo de 3
candidatos válidos que necesitará el Sprint 6.

Incremento 3 (completo): racha global — una sola racha por usuario que
suma jornadas de todas las competiciones de todos sus grupos, sin
duplicar una misma jornada compartida por varios grupos (deduplicada por
`userId` a nivel de la unión de grupos afectados en cada cierre de
jornada). `StreaksService.updateGlobalStreaks`/`getGlobalForUser` +
modelo `GlobalStreak`, reutiliza el mismo cálculo de racha
(`streak-calculator.ts`) y el mismo patrón de idempotencia por
`lastMatchdayId` que las rachas por grupo. Expuesta en
`GET /users/me/profile` y en la pantalla de Perfil (sustituye la
aproximación anterior por `Math.max` de las rachas por grupo, que podía
sobreestimar). 4 tests unitarios (deduplicación de query, participar en
cualquier grupo cuenta, faltar una jornada la rompe, idempotencia) +
verificado en vivo en el navegador (registro, unión a grupo, pantalla de
Perfil mostrando "RACHA GLOBAL ACTUAL"/"MEJOR RACHA GLOBAL" y el texto
explicativo). Commiteado y empujado a `dev`.

Pendiente del mismo sprint, en incrementos siguientes: orden estable de
jornadas por cierre de pronósticos (necesita investigación con datos
reales antes de implementar, ver `backlog.md`), estadísticas agregadas
por temporada. Ver `roadmap.md` Sprint 5 para el detalle exacto de cada
tarea.

Sin verificar en Sprint 3/4: iOS/Android (solo web).

**Infraestructura — entorno dev/pre**: sigue como en el cierre anterior —
`dev.acerton.app` funcionando (login incluido), pendiente subir producción
a Render Starter y Cloudflare Access. Ver issue #16. Además, esta sesión
añadió `GOOGLE_NATIVE_CLIENT_ID` al backend (para que el login nativo de
Google funcione también contra un backend con `GOOGLE_CLIENT_ID` propio) y
un input `environment: production|dev` al workflow de iOS
(`ios-build.yml`) para poder generar builds de TestFlight que apunten a
dev. El usuario ya confirmó que puso la variable en Render (valor
correcto: `environment.googleWebClientId` de producción, NO el
`GIDClientID` de Info.plist — hubo una corrección a mitad de sesión, ver
`decisions.md` si hace falta el detalle) — pendiente de que confirme si
el login de Google ya funciona en el build de dev tras el redeploy.

## Último trabajo verificado

- Sprint 3: migración de schema (`ownerId`, `deletedAt` con backfill), 5
  endpoints nuevos (leave/kick/role/transfer/delete), 17 comprobaciones de
  permisos por HTTP directo, flujo completo de UI con dos sesiones de
  navegador reales.
- Sprint 4: campo `User.tutorialCompletedAt` + endpoint, `TutorialService`
  + `TutorialCoachMarkComponent` (global), `data-tutorial="..."` en los
  elementos reales que se señalan (cabecera de Tabla, botón Jornada del
  menú inferior, primer partido de Jornada, botón Perfil). Verificado con
  la posición real del resaltado (`getBoundingClientRect`) sobre cada
  elemento, el avance automático al pulsar el botón Jornada de verdad, el
  texto adaptado a ambos modos de puntuación, y que sobrevive a una
  recarga completa (persistido en servidor).
- Sprint 5 (incremento 1): `GroupSeason` + `Competition.seasonEndPreviewAt`
  + `SeasonsService` (preview, cierre real, 9 tests) + etiqueta de
  temporada en Tabla.
- Sprint 5 (incremento 2): `EligibilityService` (50% inclusive, exclusión
  por fecha de incorporación, deduplicación por jornada) + endpoint, 8
  tests unitarios + verificado en vivo.
- Sprint 5 (incremento 3): racha global (`GlobalStreak`,
  `updateGlobalStreaks`/`getGlobalForUser`), 4 tests unitarios +
  verificado en vivo en Perfil (navegador).
- Issue #18 (mejora de tarjeta de grupo: posición a la izquierda + liga
  obligatoria al crear grupo) completo y cerrando su causa raíz.

## Siguiente paso concreto

**Inmediato, del usuario**: probar Sprint 3, Sprint 4 y los incrementos 1-3
del Sprint 5 (temporadas, elegibilidad, racha global) en local o en
`dev.acerton.app` antes de decidir si se mergea a `main`. Todo está en
`dev`, empujado a `origin/dev`, **no mergeado a `main` todavía**.

Cuando el usuario confirme que funciona: mergear a `main` (con
autorización explícita, como siempre). Los issues #8 y #9 ya están en
Status "Test"; el #10 (Sprint 5) se queda en "New features" hasta que el
sprint entero esté completo (regla de la skill: solo se mueve a Test
cuando el issue queda completo con esa subida).

Después, seguir con los siguientes incrementos del Sprint 5 (orden
estable de jornadas, estadísticas agregadas) — ver `roadmap.md` — o con
infraestructura pendiente (issue #16).

## Bloqueos y preguntas pendientes

Ver `backlog.md`. Sin cambios nuevos desde el cierre de las preguntas de
Sprint 3 y la decisión de fin de temporada del Sprint 5.

## Cambios sin commit

No — todo el trabajo de Sprint 3, Sprint 4, los incrementos 1-3 del
Sprint 5, la mejora de tarjeta de grupo (issue #18) y el arreglo de
Google auth/workflow de iOS está commiteado y empujado a `origin/dev`. El
entorno local (Docker + backend + frontend) sigue corriendo en segundo
plano. Se limpiaron todos los usuarios/grupos de prueba creados durante
esta sesión (por ID exacto, dentro de transacciones explícitas — ver
`decisions.md`/memoria de sesión sobre el incidente de borrado
accidental).
