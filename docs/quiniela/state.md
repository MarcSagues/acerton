# Estado actual

_Última actualización: 2026-09-10 (Sprint 1 cerrado con varias rondas de feedback; entorno dev/pre documentado como tarea de infraestructura — sesión en curso, todavía no cerrada con `/quiniela cerrar`)._

## Sprint activo

**Sprint 1 — Interfaz de juego**: las 10 tareas originales están
implementadas y verificadas en web, más varias iteraciones de ajuste fino
pedidas directamente por el usuario tras verlas funcionar (ver
`decisions.md` para el detalle de cada iteración):

- El efecto de "guardando" pasó de un pulso en bucle → crecimiento radial
  → trazo direccional con duración fija → **trazo direccional cuya
  duración la marca la propia petición de red** (versión final), sin
  ningún borde verde estático de fondo.
- Resultado exacto: los dos inputs + separador ahora son una sola caja con
  un único borde, reciben el mismo efecto de trazo (sin relleno de fondo),
  y las etiquetas L/V se muestran una vez como cabecera de columna, no por
  fila.

Sigue pendiente (no forzado en esta sesión): verificación en iOS/Android,
y forzar deliberadamente un fallo real de red (solo se probó con retrasos
artificiales, no con una petición que realmente falle).

Además, en esta misma sesión se avanzó bastante una **tarea de
infraestructura fuera de la numeración de sprints**: entorno dev/pre en
`dev.acerton.app` (ver `roadmap.md` § Infraestructura). Decidido:
producción a Render Starter (~7$/mes), dev en plan free; datos de prueba
(no copia de producción); acceso solo para el usuario y su compañero.

Ejecutado en esta sesión:
- **Neon**: rama `dev` creada a partir de `production` y purgada de datos
  reales de usuario (con confirmación explícita del usuario, ver
  `decisions.md`) — catálogo (competiciones/partidos/insignias) intacto.
- **Frontend**: nueva configuración de build `dev` (`environment.dev.ts`,
  configuración `dev` en `angular.json`, script `build:dev`) apuntando a
  `https://api-dev.acerton.app/api` — sin esto el build por defecto
  usaba la configuración de producción y el login de Google en
  `dev.acerton.app` autenticaba contra producción (bug real, encontrado
  y corregido en esta sesión).
- **Cloudflare Pages + Google Cloud Console**: el usuario fue creando el
  proyecto de Pages y el redirect URI de Google en tiempo real durante la
  conversación, con indicaciones paso a paso (sin acceso directo de esta
  sesión a esos paneles). Quedó pendiente confirmar, tras cambiar el
  build command de Cloudflare a `npm run build:dev` y redesplegar, que el
  login ya autentica contra `api-dev.acerton.app` — **verificar esto es
  el primer paso al retomar**.

Pendiente todavía: subir el backend de **producción** a Render Starter,
crear el Web Service de **dev** en Render con las variables de entorno ya
dadas al usuario en el chat, y Cloudflare Access para restringir el
acceso a los dos emails decididos.

## Último trabajo verificado

- Sprint 1 (10 tareas + iteraciones de feedback), todo verificado con un
  navegador real (no solo build): capturas, lectura de `stroke-dashoffset`/
  `border-color`/`background-color` computados en varios instantes, con
  peticiones de red retardadas artificialmente para separar las fases.
- Bug de fuga de estado entre grupos (pre-existente) encontrado y
  corregido durante la verificación — ver `decisions.md`.
- Entorno de desarrollo local sigue corriendo (Docker + backend + frontend
  en segundo plano de esta sesión) para que el usuario pueda probar sin
  montarlo de nuevo.

## Siguiente paso concreto

**Inmediato**: confirmar que, tras cambiar el build command de Cloudflare
Pages a `npm run build:dev` y redesplegar, el login con Google en
`dev.acerton.app` ya autentica contra `api-dev.acerton.app` (no contra
producción) y la sesión persiste al volver a `dev.acerton.app`.

Después, dos caminos posibles, a elegir por el usuario:

**A) Seguir con producto — Sprint 2 (Grupos y navegación)**:
1. Selector Público/Privado de dos opciones en vez de checkbox:
   `frontend/src/app/features/groups/group-list/group-list.component.html`
   (línea ~124-127, `formControlName="isPublic"`).
2. Detalle ampliable del comodín de remontada en el mismo formulario.
3. Confirmar comportamiento de entrada según nº de grupos y destino al
   pulsar un grupo (→ Tabla) — no verificado todavía. Ver `roadmap.md`
   Sprint 2 para la tabla completa.

**B) Entorno dev/pre**: pasos 2-6 de `roadmap.md` § Infraestructura
(subir producción a Render Starter, crear el Web Service de dev, conectar
Cloudflare Pages + Access) — el usuario tiene que hacerlos él mismo desde
los paneles, o compartir acceso/tokens en una sesión futura. La connection
string de la rama `dev` de Neon ya se le entregó en el chat para cuando
configure las variables de entorno del backend de dev.

## Bloqueos y preguntas pendientes

Ver `backlog.md`. Sin cambios en los bloqueos de sprints de producto
(Sprint 3 necesita decidir roles/borrado de grupo; Sprint 5/6 necesitan
diseño de temporadas; Sprint 8 necesita decidir deduplicación de
insignias). Ninguno bloquea el Sprint 2 ni el entorno dev/pre.

## Cambios sin commit

No — el usuario pidió explícitamente subirlo todo ("sí, súbelo") y se
commiteó y empujó a `origin/dev` en esta misma sesión. El entorno local
(Docker + backend + frontend) sigue corriendo en segundo plano por si
hace falta seguir probando.
