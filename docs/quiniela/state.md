# Estado actual

_Última actualización: 2026-09-10 (Sprint 3 y Sprint 4 completos en `dev`,
verificados en web, pendiente de que el usuario los pruebe antes de
mergear a `main` — sesión todavía abierta, no cerrada con `/quiniela
cerrar`)._

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

Sin verificar en ambos sprints: iOS/Android (solo web).

**Infraestructura — entorno dev/pre**: sigue como en el cierre anterior —
`dev.acerton.app` funcionando (login incluido), pendiente subir producción
a Render Starter y Cloudflare Access. Ver issue #16. Además, esta sesión
añadió `GOOGLE_NATIVE_CLIENT_ID` al backend (para que el login nativo de
Google funcione también contra un backend con `GOOGLE_CLIENT_ID` propio) y
un input `environment: production|dev` al workflow de iOS
(`ios-build.yml`) para poder generar builds de TestFlight que apunten a
dev — **pendiente**: el usuario tiene que añadir esa variable al servicio
de dev en Render (valor exacto en el historial de esta sesión), esta
sesión no tiene acceso al dashboard.

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
- Issue #18 (mejora de tarjeta de grupo: posición a la izquierda + liga
  obligatoria al crear grupo) completo y cerrando su causa raíz.

## Siguiente paso concreto

**Inmediato, del usuario**: probar Sprint 3 y Sprint 4 en local o en
`dev.acerton.app` antes de decidir si se mergea a `main`. Todo está en
`dev`, empujado a `origin/dev`, **no mergeado a `main` todavía**.

Cuando el usuario confirme que funciona: mergear a `main` (con
autorización explícita, como siempre). Los issues #8 y #9 ya están en
Status "Test" en el GitHub Project (regla corregida: se movieron al
completarse en `dev`, no se espera al merge).

Después, Sprint 5 (Temporadas, estadísticas y rachas, issue #10) sigue
bloqueado por diseño de modelo de datos — ver `backlog.md` — o seguir con
infraestructura pendiente (issue #16, más la nueva variable de Google en
Render mencionada arriba).

## Bloqueos y preguntas pendientes

Ver `backlog.md`. Sin cambios nuevos desde el cierre de las preguntas de
Sprint 3.

## Cambios sin commit

No — todo el trabajo de Sprint 3, Sprint 4, la mejora de tarjeta de grupo
(issue #18) y el arreglo de Google auth/workflow de iOS está commiteado y
empujado a `origin/dev`. El entorno local (Docker + backend + frontend)
sigue corriendo en segundo plano. Se limpiaron los grupos de prueba
creados durante esta sesión (por ID exacto, dentro de transacciones
explícitas — ver `decisions.md`/memoria de sesión sobre el incidente de
borrado accidental).
