# Estado actual

_Última actualización: 2026-09-10 (Sprint 2 completo y verificado en web, más un ajuste de UX posterior en Ajustes del grupo — botón "Guardar cambios" unificado — pendiente de que el usuario lo pruebe en dev.acerton.app antes de mergear a main — sesión todavía abierta, no cerrada con `/quiniela cerrar`)._

## Sprint activo

**Sprint 1 — Interfaz de juego**: cerrado, mergeado a `main`, confirmado
funcionando en `dev.acerton.app`.

**Sprint 2 — Grupos y navegación**: **completo**, las 11 tareas
implementadas y verificadas en web (navegador real, no solo capturas).
Ver `roadmap.md` Sprint 2 para el detalle de cada una. Resumen de lo más
relevante:
- Selector Público/Privado de dos opciones + detalle ampliable del
  comodín de remontada, en el formulario de creación.
- `GroupsService.postLoginRoute()`: con 1 grupo entras en Jornada, con
  varios en Grupos (antes siempre Jornada).
- Pulsar un grupo en la lista lleva a su Tabla (antes a Jornada).
- Preview de cada grupo con tu posición general real (backend nuevo:
  `myPosition` en `/groups/mine`, mismo criterio de scope que Tabla) —
  de paso arregló que los chips de competiciones nunca se mostraban.
- Grupo activo marcado con un check en el selector desplegable.
- **Enlaces directos respetados**: `authGuard`/`usernameGuard` guardan la
  URL original (`returnUrl`) y los 4 flujos de login (+ confirmación de
  nombre de cuentas nuevas de Google) vuelven ahí — antes, un enlace de
  invitación pulsado sin sesión iniciada se perdía sin más. Verificado
  con datos reales: un usuario sin cuenta que entra por un link de
  invitación acaba siendo miembro real del grupo tras registrarse.
- "Guardar reglas" ahora también exige un cambio real, igual que ya
  pasaba con competiciones.
- Ajustes del grupo: el botón "Editar" de Reglas se movió al final de la
  lista de reglas (antes salía arriba, junto al título). Y se unificó el
  guardado: un único botón "Guardar cambios" que guarda competiciones y
  reglas juntas en un solo click (ya no hay un botón por sección), y
  además ahora flota fijo encima de la barra de navegación, apareciendo
  solo cuando hay un cambio pendiente (antes vivía al final del todo, tras
  Miembros).

Sin verificar todavía: iOS/Android (solo web).

**Infraestructura — entorno dev/pre**: sigue como en el cierre anterior
— `dev.acerton.app` funcionando (login incluido), pendiente subir
producción a Render Starter y Cloudflare Access. Ver issue #16.

## Último trabajo verificado

- Sprint 2 completo: 4 commits en `dev` (privacidad+rutas de login,
  posición en la tarjeta de grupo, grupo activo+enlaces directos, guardar
  reglas), todo con evidencia real de navegador (no solo build):
  - Registro→0 grupos→`/welcome`; 2 grupos→reingreso→`/groups`; pulsar
    una tarjeta→`/rankings`.
  - Posición real leída de `ranking_snapshots` generados por los crons de
    fondo durante la propia sesión de pruebas (no solo datos sintéticos).
  - Usuario sin cuenta previa que entra por `/groups/join/TUWA8P8Q`
    estando desconectado acaba siendo miembro real del grupo tras
    registrarse — confirmado directamente en la base de datos.
- Sprint 1 (ver entradas anteriores).
- Entorno de desarrollo local: se cayó una vez durante esta sesión (al
  correr `nest build` mientras `nest start --watch` seguía activo) y se
  reinició sin problema — sigue corriendo en segundo plano.

## Siguiente paso concreto

**Inmediato, del usuario**: probar el Sprint 2 completo (en local o en
`dev.acerton.app`, una vez el commit llegue ahí) antes de decidir si se
mergea a `main`. Todo está en `dev`, empujado a `origin/dev`, **no
mergeado a `main` todavía** — a la espera de que se pruebe primero.

Cuando el usuario confirme que funciona: mergear a `main` (con
autorización explícita, como siempre) y, como parte de ese merge, mover
a Status "Test" en GitHub Project el issue #7 (Sprint 2) y marcar sus
checkboxes.

Después, Sprint 3 (Roles y membresías, issue #8) está bloqueado por
decisiones de modelo de datos — ver `backlog.md` — o seguir con
infraestructura pendiente (issue #16).

## Bloqueos y preguntas pendientes

Ver `backlog.md`. Sin cambios.

## Cambios sin commit

No — los 4 commits del Sprint 2 están hechos localmente en `dev`.
**Pendiente de `git push origin dev`** (se hace junto con este commit de
documentación). El entorno local (Docker + backend + frontend) sigue
corriendo en segundo plano.
