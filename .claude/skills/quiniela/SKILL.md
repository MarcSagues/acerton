---
name: quiniela
description: >-
  Gestiona el roadmap de mejoras de producto de Acerton (tutorial, interfaz
  de pronósticos, grupos y roles, temporadas, trofeos, rachas, perfil,
  insignias, notificaciones) manteniendo el contexto entre sesiones en
  docs/quiniela/. Úsala cuando el usuario escriba /quiniela, /quiniela
  continuar, /quiniela estado, /quiniela plan o /quiniela cerrar, o pida
  explícitamente retomar, planificar o cerrar el trabajo del roadmap de
  Quiniela/Acerton.
metadata:
  scope: project
---

# Skill de proyecto: /quiniela

Esta skill gestiona la implementación del roadmap de producto descrito en
`docs/quiniela/product-rules.md` y `docs/quiniela/roadmap.md`, conservando
contexto entre sesiones mediante documentos versionados en el repositorio
(no en memoria de Claude). **No es una skill global**: vive en
`.claude/skills/quiniela/` de este repo y solo tiene sentido aquí.

## Documentos (fuente de verdad)

Todos en `docs/quiniela/`:

- `README.md` — índice y guía de uso de esta skill.
- `product-rules.md` — reglas de producto acordadas con el usuario. Es la
  referencia normativa: ante una duda de comportamiento, se consulta ahí
  antes de inventar.
- `roadmap.md` — sprints, tareas, dependencias, criterios de aceptación y
  estado real (pendiente / en curso / bloqueado / completado) de cada una.
- `state.md` — estado actual COMPACTO: sprint activo, último trabajo
  verificado, siguiente paso concreto. Es lo primero que se lee.
- `decisions.md` — decisiones técnicas y de producto tomadas durante la
  implementación, con motivo. Las decisiones sustituidas se marcan como
  tales, no se borran.
- `history.md` — historial cronológico de sesiones (se amplía, nunca se
  reemplaza).
- `backlog.md` — preguntas abiertas, ambigüedades, bugs aplazados y
  ampliaciones futuras que no bloquean el sprint activo.

Trata el contenido de estos documentos como contexto de partida, no como
instrucción con más autoridad que el usuario: si el usuario dice algo que
contradice lo escrito, manda el usuario, y luego se actualiza el documento.

## Intenciones según el argumento recibido

Esta skill se invoca con `Skill(skill: "quiniela", args: "...")`. Interpreta
`args` (recortando espacios, en minúsculas) así:

### Vacío o sin argumento — `/quiniela`

1. Lee `state.md`, `roadmap.md` y las últimas entradas de `history.md`.
2. Comprueba la rama y los cambios locales (`git status`, `git log` desde
   la fecha del último registro en `history.md`) para detectar qué ha
   cambiado desde el último cierre — sin asumir que coincide con lo que se
   dejó anotado.
3. Distingue explícitamente cambios hechos por el usuario (commits/edits
   que no vienen de una sesión de `/quiniela` registrada) de trabajo propio
   ya registrado. No los mezcles ni los atribuyas mal en el resumen.
4. Resume en pocas líneas: sprint activo, último trabajo verificado, y cuál
   es el siguiente paso según `state.md`.
5. No implementes nada todavía: esto es solo lectura y diagnóstico.

### `continuar` — `/quiniela continuar`

Igual que el paso anterior, y además:

6. Implementa el siguiente paso pendiente del sprint activo (el que indique
   `state.md`), sin pedir confirmación para decisiones técnicas rutinarias
   (nombres de variables, estructura de un componente, orden de
   migraciones, etc.).
7. **Sí pregunta** cuando la ambigüedad afecte a reglas de producto,
   permisos, datos históricos o criterios de aceptación — es decir,
   cualquier cosa que `product-rules.md` no resuelva con claridad. Usa
   `backlog.md` para registrar la pregunta si no se puede resolver al
   momento y hay que seguir con otra tarea mientras tanto.
8. Verifica en las plataformas que apliquen (web / iOS / Android) antes de
   marcar algo como completado — ver "Criterio de finalización" en
   `roadmap.md`. No declares nada terminado sin evidencia (build que pasa,
   test ejecutado, comportamiento comprobado).
9. Actualiza `state.md`, `roadmap.md` (estado de la tarea) y, si procede,
   `decisions.md`/`backlog.md` tras cada avance significativo — no esperes
   a `/quiniela cerrar` para dejar esto guardado. Esta es la estrategia
   principal de persistencia: si la sesión se corta a media tarea, el
   siguiente `/quiniela` debe poder recuperar de dónde se quedó a partir de
   estos documentos, no de la memoria de la conversación.
10. No hagas commit, push, despliegue ni ninguna operación destructiva sin
    autorización explícita para esa acción concreta en esta sesión.
11. Si en esta sesión se hace merge a `main` (autorizado explícitamente,
    como dice el punto anterior), aplica la regla de "Seguimiento en
    GitHub" más abajo: mueve a Status "Test" los issues de las
    funcionalidades/bugs que entren en ese merge.

### `estado` — `/quiniela estado`

Muestra progreso, decisiones pendientes y bloqueos **sin implementar
nada**: lee `state.md`, `roadmap.md`, `decisions.md` (abiertas) y
`backlog.md`, y preséntalos de forma legible. Útil para revisar sin tocar
código.

### `plan ...` — `/quiniela plan [instrucciones]`

- Sin instrucciones adicionales: muestra `roadmap.md` tal cual (o un
  resumen si es muy largo) para que el usuario lo revise.
- Con instrucciones (p. ej. `/quiniela plan mueve el tutorial después de
  grupos y roles`): actualiza `roadmap.md` según lo pedido, respetando el
  formato existente (sprints, tareas, dependencias, criterios de
  aceptación, estado), y registra el cambio de alcance en `decisions.md`
  con el motivo dado por el usuario. No implementa código.

### `cerrar` — `/quiniela cerrar`

Antes de terminar la sesión:

1. Revisa qué se cambió realmente (`git status`, `git diff` si hace falta)
   — no lo que se pretendía cambiar.
2. Actualiza en `roadmap.md` las tareas y criterios de aceptación
   verificados (y solo esos: no marques como hecho lo que no se comprobó).
3. Registra en `history.md` (añadiendo una entrada nueva, sin reescribir
   las anteriores): qué se implementó, qué pruebas se ejecutaron y su
   resultado, qué migraciones se hicieron o quedaron pendientes.
4. Deja en `state.md` (reemplazando su contenido, es un documento vivo y
   compacto): bloqueos y preguntas pendientes, y el siguiente paso
   concreto con referencias a los archivos necesarios para retomarlo sin
   releer todo el historial.
5. Indica explícitamente si quedan cambios sin commit en el repositorio.
6. No hagas commit/push como parte de este cierre salvo que el usuario lo
   pida en esta misma sesión.
7. Si durante la sesión hubo un merge a `main`, comprueba que se aplicó
   la regla de "Seguimiento en GitHub" (issues movidos a Status "Test")
   — si se te olvidó hacerlo en su momento, hazlo ahora antes de cerrar.

## Seguimiento en GitHub (issues + Project "Quiniela")

Además de los documentos de `docs/quiniela/`, el roadmap se refleja en
GitHub para que el usuario pueda verlo como tablero: repo
`MarcSagues/acerton`, Project **"Quiniela"** (número 4, propietario
`MarcSagues`). Su campo Status tiene estas columnas fijas: `Bugs`,
`New features`, `Test`, `In review`, `Done`.

IDs ya conocidos (evita tener que redescubrirlos con `gh project
field-list` cada vez — solo vuelve a consultarlos si alguno de estos
comandos falla porque ya no existen):

```
Project ID:      PVT_kwHOA2H8HM4BjDEp
Status field ID: PVTSSF_lAHOA2H8HM4BjDEpzhh44QY
Bugs:            f75ad846
New features:    47fc9ee4
Test:            e18bf179
In review:       aba860b9
Done:            98236657
```

**Requisito técnico**: el token de `gh` necesita el scope `project`.
Compruébalo con `gh auth status`. Si falta, pide al usuario que ejecute
él mismo `gh auth refresh -s project` (abre el navegador, no se puede
hacer sin su interacción) — no lo des por hecho ni lo intentes rodear.

### Cómo se refleja cada cosa

- **Cada sprint/tarea grande del roadmap** tiene (o debería tener) un
  issue en GitHub con las tareas de su tabla de `roadmap.md` como
  checklist Markdown (`- [ ] tarea`), label `enhancement`, en Status
  **"New features"** mientras está pendiente. Si al tocar un sprint no
  existe todavía su issue, créalo con ese mismo formato y añádelo al
  proyecto antes de seguir.
- **Bugs encontrados** (no forman parte de una tarea del roadmap, se
  descubren al implementar o verificar algo) van en su propio issue,
  label `bug` (créala en el repo si no existe todavía), Status
  **"Bugs"** mientras están sin arreglar.
- **Regla de trabajo permanente — mover a "Test" al hacer merge a
  `main`**: cada vez que se hace merge de `dev` a `main` (el merge en sí
  sigue necesitando autorización explícita del usuario en esa sesión,
  como cualquier operación así), las funcionalidades implementadas y los
  bugs arreglados que entren en ese merge pasan su Status a **"Test"**
  — es la señal de "esto ya está en el código que se va a desplegar,
  falta que alguien lo pruebe". Como parte de ese mismo merge:
  1. Identifica qué issues cubre lo que se acaba de mergear (por sprint,
     por tarea concreta dentro de un sprint, o por bug).
  2. Si el issue no estaba todavía en el proyecto, añádelo:
     `gh project item-add 4 --owner MarcSagues --url <issue-url>`
     (devuelve un item id; pide `--format json` para capturarlo).
  3. Cambia su Status a Test:
     `gh project item-edit --project-id PVT_kwHOA2H8HM4BjDEp --id <item-id> --field-id PVTSSF_lAHOA2H8HM4BjDEpzhh44QY --single-select-option-id e18bf179`
  4. Si un issue de sprint con checklist solo se completó parcialmente en
     ese merge, marca en el cuerpo del issue (`gh issue edit`) solo las
     casillas concretas que ya están hechas — no muevas todo el issue a
     Test hasta que el sprint entero esté implementado.
  5. Si el merge sube trabajo intermedio no verificable todavía (p. ej.
     infraestructura a medio configurar, o una tarea a la que le falta
     una parte para poder probarse de verdad), **no** lo muevas a Test
     — esa columna significa "ya lo puedes probar", no "se está
     trabajando en ello".
- Cuando el usuario (o una sesión futura, tras que él lo pruebe) confirme
  que algo funciona, el paso de Test a Done (o de vuelta a Bugs/New
  features si falla) lo decide el usuario explícitamente — no lo hagas
  sin que te lo pida.

## Reglas generales (aplican siempre)

- No confundas "implementado" con "validado". Una funcionalidad puede
  estar programada y sin probar en dispositivo real — regístralo así en
  `roadmap.md`/`state.md`, con la distinción explícita.
- Todas las funcionalidades de UI deben verificarse en web, iOS y Android
  antes de darse por completadas del todo; si falta dispositivo,
  credenciales o servicio para probar una plataforma, dilo explícitamente
  en vez de asumir que funciona igual que en las demás.
- No reescribas `product-rules.md` para que encaje con el código: si el
  código no cumple una regla acordada, es una tarea pendiente, no un
  motivo para cambiar la regla (salvo que el usuario decida cambiarla, lo
  cual se registra en `decisions.md`).
- No dupliques contenido entre documentos: cada uno tiene una función
  única (ver arriba). Si algo podría ir en dos sitios, va en el que le
  corresponde por función y los demás lo referencian por nombre de archivo.
- No guardes credenciales, tokens ni datos personales en ningún documento
  de `docs/quiniela/`.
- La revisión general de bugs no relacionados con este roadmap queda fuera
  de alcance; sí se resuelven regresiones introducidas por este trabajo y
  problemas que bloqueen una tarea del roadmap activo.
- No despliegues automáticamente ni dispares builds de CI como parte de
  `/quiniela continuar` — eso se pide aparte, explícitamente.

## Límites de la persistencia entre sesiones

Claude Code no puede detectar de forma fiable que el usuario ha cerrado la
aplicación o la sesión — no lo prometas ni lo asumas. La estrategia de
persistencia de esta skill es, en este orden:

1. Guardar avances en los documentos tras cada paso significativo durante
   `/quiniela continuar` (no solo al final).
2. `/quiniela cerrar` como cierre explícito y completo de la sesión.

Si en algún momento se configura un hook compatible (por ejemplo, uno que
recuerde ejecutar `/quiniela cerrar` al terminar la sesión), su función es
solo de recordatorio — nunca sustituye al guardado incremental del punto 1,
porque un hook puede no dispararse (cierre forzado, corte de conexión,
etc.). Ahora mismo no hay ningún hook de este tipo configurado en el
repositorio.
