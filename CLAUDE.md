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
