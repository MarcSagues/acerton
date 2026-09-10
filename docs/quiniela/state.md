# Estado actual

_Última actualización: 2026-09-10 (Sprint 2 mergeado a `main`, confirmado por
el usuario — issue #7 cerrado y en Status "Done" en GitHub Project. Sprint 3
completo en `dev`, verificado en web, pendiente de que el usuario lo pruebe
antes de mergear a `main` — sesión todavía abierta, no cerrada con
`/quiniela cerrar`)._

## Sprint activo

**Sprint 1 — Interfaz de juego**: cerrado, mergeado a `main`, confirmado
funcionando en producción.

**Sprint 2 — Grupos y navegación**: cerrado. Mergeado a `main` y desplegado
a producción. El usuario cerró el issue #7 en GitHub manualmente (confirma
que funciona) — la automatización del Project lo movió a Status "Done".
Ver `roadmap.md` Sprint 2 para el detalle.

**Sprint 3 — Roles y membresías**: **completo en `dev`**, verificado en
web (no solo capturas: peticiones HTTP directas + navegador con dos
sesiones reales). Resumen:
- Decisiones de schema tomadas con el usuario (ver `decisions.md`):
  `Group.ownerId` (campo directo, no rol nuevo) y `Group.deletedAt`
  (borrado lógico).
- Backend: `leave`, `kick` (expulsar), `updateMemberRole`
  (promover/degradar admin, exclusivo del propietario),
  `transferOwnership`, `deleteGroup` (borrado lógico). Todo el resto de
  lecturas de grupo (`mine`, `public`, `findOne`, unirse por invitación)
  excluye grupos eliminados.
- Reglas de `product-rules.md` verificadas exactamente por HTTP directo
  (17 casos: quién puede/no puede hacer cada operación, incluyendo los
  que deben fallar con 403/400) — no solo desde la interfaz.
- Frontend (`group-detail`): insignia "Creador" distinta de "Admin",
  menú de acciones por miembro (solo visible si el usuario actual tiene
  alguna acción disponible sobre esa fila), "Salir del grupo" (deshabilitado
  + texto de ayuda para el propietario), "Eliminar grupo" (solo
  propietario). Verificado con dos sesiones de navegador simultáneas
  (propietario + miembro) todo el flujo: promover, degradar, transferir,
  salir, eliminar, y que el grupo desaparece de "Mis grupos" tras
  eliminarlo.
- Migración con backfill: los 14 grupos ya existentes en la base de datos
  local recibieron `ownerId` = su admin más antiguo (único camino posible
  para ser admin antes de este sprint).

Sin verificar todavía: iOS/Android (solo web). Pendiente del roadmap:
"Reincorporación no reinicia fecha de participación" sigue bloqueado por
el modelo de temporadas (Sprint 5).

**Infraestructura — entorno dev/pre**: sigue como en el cierre anterior —
`dev.acerton.app` funcionando (login incluido), pendiente subir producción
a Render Starter y Cloudflare Access. Ver issue #16.

## Último trabajo verificado

- Sprint 3 completo: migración de schema (`ownerId`, `deletedAt` con
  backfill), 5 endpoints nuevos, 17 comprobaciones de permisos por HTTP
  directo, flujo completo de UI con dos sesiones de navegador reales.
- Sprint 2: mergeado a `main`, push a `origin/main` sin conflictos,
  confirmado por el usuario (issue #7 cerrado manualmente).
- Refinamientos de Ajustes del grupo posteriores al cierre de Sprint 2
  (botón "Editar reglas" reordenado, guardado unificado y flotante,
  toggles de privacidad/comodín integrados en el guardado): todos
  incluidos en el merge a `main`.

## Siguiente paso concreto

**Inmediato, del usuario**: probar el Sprint 3 completo (roles,
expulsión, transferencia, salir, eliminar grupo) en local o en
`dev.acerton.app` una vez el commit llegue ahí, antes de decidir si se
mergea a `main`. Todo está en `dev`, empujado a `origin/dev`, **no
mergeado a `main` todavía**.

Cuando el usuario confirme que funciona: mergear a `main` (con
autorización explícita, como siempre). El issue #8 (Sprint 3) ya está en
Status "Test" en el GitHub Project (aplicando la regla corregida: se
movió al completarse en `dev`, no se esperó al merge a `main`).

Después, Sprint 4 (Tutorial, issue #9) no tiene bloqueos de datos
pendientes — o seguir con infraestructura pendiente (issue #16).

## Bloqueos y preguntas pendientes

Ver `backlog.md`. Las dos preguntas de Sprint 3 (modelo de propietario,
borrado de grupo) se resolvieron con el usuario y están en `decisions.md`.

## Cambios sin commit

No — todo el trabajo de Sprint 3 está commiteado y empujado a
`origin/dev`. El entorno local (Docker + backend + frontend) sigue
corriendo en segundo plano.
