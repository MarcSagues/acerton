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
