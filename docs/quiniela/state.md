# Estado actual

_Última actualización: 2026-09-10 (Sprint 1 cerrado; roadmap completo volcado a GitHub Issues/Project; puesta en marcha de dev.acerton.app en curso — sesión todavía abierta, no cerrada con `/quiniela cerrar`)._

## Sprint activo

**Sprint 1 — Interfaz de juego**: cerrado, verificado en web (ver
`roadmap.md` y `decisions.md` para el detalle de las iteraciones de
feedback). Pendiente: iOS/Android, y forzar un fallo real de red.

**Infraestructura — entorno dev/pre**: en curso, más avanzado que
documentado la última vez. Decidido y ejecutado: rama `dev` de Neon
(datos de prueba), configuración de build `dev` del frontend. El usuario
ha ido creando en tiempo real, con indicaciones paso a paso: Web Service
de Render para dev, proyecto de Cloudflare Pages con dominio
`dev.acerton.app`, cliente OAuth de Google dedicado (`acerton-dev`, un
proyecto de Google Cloud propio, no el de producción).

**Bloqueador actual (a medio resolver)**: el login en `dev.acerton.app`
todavía no funciona del todo. Encontrados y explicados tres fallos
sucesivos del despliegue de Render, cada uno resuelto encontrando el
siguiente debajo:
1. Start Command usaba `npm run start:dev` (modo watch, compila TS en
   caliente) en vez de `start:prod` → el proceso reventaba por falta de
   memoria (plan free, 512MB). Arreglado indicando cambiar a
   `npm run start:prod`.
2. `DATABASE_URL` con comillas coladas al pegar el valor en Render →
   Prisma rechazaba la URL al arrancar ("must start with protocol").
3. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` en Render apuntaban al
   cliente OAuth de **producción**, pero el redirect URI de dev se había
   registrado en un cliente OAuth **distinto** (`acerton-dev`, proyecto
   de Google Cloud propio para dev) → `redirect_uri_mismatch`. Se le
   pidió al usuario cambiar `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` en
   Render para que coincidan con el cliente de `acerton-dev`
   (`533114077011-2879726g3d1npjn4e7f9jqme8ls8abjv.apps.googleusercontent.com`)
   — **sin confirmar todavía si ya funciona tras este último cambio**.

## Último trabajo verificado

- Sprint 1 (10 tareas + iteraciones de feedback) verificado con navegador
  real — ver entradas anteriores de `history.md`.
- Bug de fuga de estado entre grupos (pre-existente) corregido.
- **Roadmap completo volcado a GitHub**: 16 issues creados en
  `MarcSagues/acerton`, todos en el Project "Quiniela" (número 4):
  - 6 issues de tareas del Sprint 1, columna **Test** (ya implementadas,
    a falta de que el usuario las prueba él mismo).
  - 9 issues, uno por sprint pendiente (2 al 10), columna **New
    features**, con las tareas de `roadmap.md` como checklist.
  - 1 issue de infraestructura dev/pre pendiente, columna **New
    features**.
  - Regla nueva guardada en `SKILL.md` § "Seguimiento en GitHub": al
    hacer merge a `main`, mover a Status "Test" lo implementado/arreglado
    en ese merge. Requiere que el token de `gh` tenga el scope `project`
    (ya concedido por el usuario en esta sesión).
- Entorno de desarrollo local sigue corriendo (Docker + backend +
  frontend en segundo plano de esta sesión).

## Siguiente paso concreto

**Inmediato**: confirmar con el usuario si el login en `dev.acerton.app`
ya funciona tras corregir `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` en
Render. Si sigue fallando, seguir depurando desde ahí (siguiente
sospechoso: que Render no haya terminado de redesplegar con las
variables nuevas, o algún otro campo de esas credenciales mal copiado).

Cuando dev.acerton.app funcione de punta a punta: actualizar el issue de
infraestructura (#16) marcando sus checkboxes y moverlo a Test si queda
completo, y actualizar `roadmap.md`/`decisions.md` con el cierre de esta
puesta en marcha.

Después, dos caminos posibles, a elegir por el usuario:

**A) Seguir con producto — Sprint 2 (Grupos y navegación)**, issue #7 en
GitHub. Primeros pasos concretos en `roadmap.md` Sprint 2.

**B) Terminar infraestructura pendiente** (issue #16): subir producción a
Render Starter, Cloudflare Access.

## Bloqueos y preguntas pendientes

Ver `backlog.md`. Sin cambios en los bloqueos de sprints de producto.
Nuevo: confirmar que el login de dev funciona (ver arriba).

## Cambios sin commit

Sí — los cambios de esta última tanda (`SKILL.md` con la sección de
seguimiento en GitHub, y las actualizaciones de `README.md`/
`decisions.md`/`state.md`/este archivo) todavía no se han commiteado. Los
issues y el Project de GitHub SÍ están creados de verdad (no dependen de
comitear nada, se hicieron directamente vía API). El entorno local
(Docker + backend + frontend) sigue corriendo en segundo plano.
