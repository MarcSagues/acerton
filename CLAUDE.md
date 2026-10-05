# Acerton

## Roadmap de producto (Quiniela)

Hay un roadmap de mejoras de producto en marcha, gestionado por la skill
de proyecto `/quiniela` (`.claude/skills/quiniela/SKILL.md`), con contexto
persistente en `docs/quiniela/`.

Al empezar cualquier sesión que vaya a tocar algo relacionado con
pronósticos, grupos, roles, temporadas, trofeos, rachas, perfil, avatares,
insignias o notificaciones, lee primero `docs/quiniela/state.md` (y
`docs/quiniela/roadmap.md` si hace falta más detalle) para no repetir
trabajo ni contradecir decisiones ya tomadas. Después de hacer cambios en
esas áreas, actualiza esos documentos (ver la propia skill para el
detalle de qué actualizar y cuándo).

Esto no significa implementar el roadmap automáticamente: si el usuario
pide otra cosa, se hace lo que pida. La lectura de contexto es barata y
evita sorpresas; la implementación del roadmap se hace solo a través de
`/quiniela continuar` o cuando el usuario lo pida explícitamente.

## Historial de versiones (pop-up de novedades)

La app enseña un pop-up con la lista de cambios la primera vez que se abre una
versión nueva (`WhatsNewService`), y sale de `frontend/src/app/core/changelog/changelog.ts`.
Hay que mantenerlo siempre:

- Cada cambio visible para el usuario (algo nuevo, mejorado o arreglado que se note
  jugando) añade **una línea, en español e inglés**, a la entrada de arriba, que es la
  versión en curso. Texto corto, en positivo y para quien juega ("Puedes copiar tus
  pronósticos...", no "endpoint nuevo...").
- Al subir de versión se crea una entrada **nueva arriba** (la anterior no se toca) y se
  pone la misma versión en `MARKETING_VERSION` del `.pbxproj` iOS. `scripts/check-changelog.mjs`
  (CI) falla si no coinciden: sin esa coincidencia el pop-up deja de salir sin ningún error.
- Los textos de la interfaz de la app (no los del historial) siguen las reglas de idioma del
  README (claves en `es.ts` y `en.ts`).

