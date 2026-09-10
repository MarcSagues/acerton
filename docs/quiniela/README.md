# Quiniela — roadmap de mejoras de Acerton

Este directorio conserva el contexto del roadmap de producto descrito en la
sesión de preparación del 2026-09-10, para que cualquier sesión futura de
Claude Code (u otra persona) pueda retomarlo sin depender de la memoria de
una conversación concreta.

La skill que gestiona todo esto es `/quiniela` (definida en
`.claude/skills/quiniela/SKILL.md`, solo para este repositorio).

## Cómo usarla

- **`/quiniela`** — recupera el contexto, lo contrasta con el estado real
  del repo, y te dice dónde estamos y cuál es el siguiente paso. No
  implementa nada.
- **`/quiniela continuar`** — hace lo anterior y además implementa el
  siguiente paso pendiente del sprint activo, guardando avances en estos
  documentos según va trabajando (no solo al final).
- **`/quiniela estado`** — muestra progreso, decisiones pendientes y
  bloqueos, sin tocar código.
- **`/quiniela plan`** — enseña el roadmap actual. Con instrucciones detrás
  (`/quiniela plan reordena X`), lo actualiza según lo que pidas.
- **`/quiniela cerrar`** — guarda el estado real de la sesión (qué se hizo,
  qué se probó, qué queda pendiente) y deja preparado el siguiente arranque.
  Es el cierre recomendado al terminar de trabajar, pero no es la única
  red de seguridad: los documentos también se actualizan durante el
  trabajo, por si la sesión se corta antes de poder cerrarla.

## Qué hay en cada documento

| Documento | Para qué sirve |
|---|---|
| `product-rules.md` | Reglas de producto acordadas — la referencia normativa de "cómo debe comportarse la app". |
| `roadmap.md` | Sprints, tareas, dependencias, criterios de aceptación y estado real de cada una. |
| `state.md` | Estado actual, compacto: sprint activo, último trabajo verificado, siguiente paso. Léelo primero. |
| `decisions.md` | Decisiones técnicas y de producto tomadas durante la implementación, con su motivo. |
| `history.md` | Historial cronológico de sesiones — se amplía, no se reescribe. |
| `backlog.md` | Preguntas abiertas, ambigüedades y ampliaciones aplazadas que no bloquean el sprint activo. |

## Estado de esta preparación (Sprint 0)

Esta primera sesión **no implementó funcionalidades de producto**. Preparó
la skill, creó estos documentos y contrastó las reglas acordadas contra el
código real del repositorio (ver `state.md` y `decisions.md` para el
detalle de lo que se encontró). Varias de las reglas descritas en
`product-rules.md` requieren cambios de modelo de datos que hoy no existen
(temporadas, trofeos, roles de propietario, insignias globales, etc.) —
están señalados explícitamente en `roadmap.md` y `backlog.md`, no
asumidos como ya resueltos.
