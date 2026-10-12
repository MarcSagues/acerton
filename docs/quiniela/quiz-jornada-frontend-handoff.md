# Quiz de jornada: entrega de frontend para Codex

Fecha: 2026-10-12. Implementación de Opus (Claude) en la rama `claude/quiz-jornada-frontend`, sin commit. Funcionalidad **no completa**: falta la integración contra el backend real.

## Qué hay

- `core/models/quiz.model.ts` y `core/services/quiz.service.ts`: contrato v1 tal cual (§6 del plan), `environment.apiUrl`, sin userId ni groupId.
- `features/quiz/domain/quiz-rules.ts`: reglas de presentación puras (acción de la tarjeta, jornada principal y anterior, texto de pregunta por `type`, opciones por código, resultado por pregunta, lectura de `code` de error, desfase con `serverNow`).
- `features/quiz/quiz-hub/`: `/quiz`. Selector de liga, tarjeta de jornada (estado, cierre, progreso, Iniciar/Continuar/Revisar/Ver resultados), acceso a la jornada anterior, clasificación General por defecto con filtro de liga independiente, temporada, «Ver más» por cursor y fila propia fijada si queda fuera.
- `features/quiz/quiz-play/`: `/quiz/:quizId`. Entrada (Empezar = POST participation), una pregunta por paso, guardado por selección con Guardando/Guardado/fallo y Reintentar, resumen con Finalizar, resultados de solo lectura (acierto, fallo, sin responder, pendiente, anulada).
- `features/quiz/testing/quiz.fixtures.ts`: datos de ejemplo **solo para specs**. La app no los importa: si la API falla se ve el error, nunca datos inventados.

Comportamientos que dependen del servidor:

- Escrituras en fila (`concatMap`): cada PUT lleva una respuesta y la siguiente sale al contestar la anterior. Lo que se pinta como guardado es siempre `selectedOption` de la última respuesta del servidor.
- Error al guardar: no se marca como guardada. `QUIZ_CLOSED`/`QUIZ_NOT_OPEN`: aviso de cierre, GET del detalle y resultados solo con lo confirmado.
- Contador con `serverNow`: al pasar `closesAt` bloquea los controles y pide el detalle (o el resumen en `/quiz`) **una vez por valor de closesAt**. Si el servidor sigue aceptando (cierre movido), se puede seguir. La clasificación no se pide con el contador.
- Respuestas tardías de la clasificación (cambio de liga/temporada) se descartan. El selector de juego no hace peticiones: usa `/quiz/overview`.
- Hora: `kickoffConfirmed === false` (o las 00:00 UTC de relleno del proveedor en un partido) sale como «hora por confirmar».

## Navegación y acceso sin grupo

- Barra inferior: Perfil → Quiz (icono `objetivo`). Perfil sigue en el avatar de la cabecera, que ahora lleva el punto rojo de subida de nivel y el paso final del tutorial (texto ajustado en los seis idiomas).
- `/quiz` y `/quiz/:quizId` sin `hasGroupGuard`. En `/quiz/:id` se oculta la barra inferior (tiene su propia navegación).
- Sin `hasGroupGuard` también: `/profile` y sus pantallas de cuenta (avatar, apariencia, contraseña, borrar cuenta, invitar, insignias, nivel, trofeos) y `/notifications`. Estadísticas, histórico y normas lo conservan; en Perfil sin grupo se sustituyen por un acceso a Grupos y se oculta «ver el tutorial».
- `/welcome` (fuera del shell) tiene un acceso al Quiz. Sin bucles: `/matchday` → `/welcome` → `/quiz` → avatar → `/profile`.
- Gesto de volver: `/quiz` es raíz, `/profile` ya no.

Textos en es/en/ca/fr/it/de (`quiz.*`, `bottomNav.quiz`, `profilePage.sinGrupoEstadisticas`) y una línea en la 1.0.3 del historial.

## Verificación hecha

- 177 tests del frontend (35 nuevos: reglas, centro y recorrido), `ng build` de producción y `scripts/check-changelog.mjs`.
- Revisión visual en Chromium a 375×812 con un servidor simulado **del scratchpad, fuera del repo** (build de desarrollo + respuestas del contrato): usuario sin grupo desde `/matchday` → `/welcome` → Quiz; centro, liga sin quiz, liga programada, clasificación con fila propia, «Ver más», filtro vacío; Empezar, Guardando/Guardado, fallo 500 y Reintentar, `QUIZ_CLOSED` al guardar, cierre por contador (una sola petición), resumen y Finalizar, vuelta al centro con progreso, resultados resueltos/pendientes/anulados, Perfil sin grupo. Alemán y francés sin desbordes.
- **No probado**: contra el backend real, iPhone/Android, catalán e italiano en pantalla (solo los tests de catálogo).

## Ajustes propuestos al contrato (no se depende de ellos)

1. Temporadas de la clasificación: no hay forma de listarlas. El selector sale de los `seasonLabel` del resumen y de la clasificación, así que una temporada pasada solo aparece si llega un quiz suyo. Propuesta: `seasons: string[]` en `QuizRanking`.
2. Título de la jornada: se usa `matchdayOrder` («Jornada 9»). Si para Champions conviene el nombre de fase, habría que acordar que `matchdayName` es presentable o mandar una etiqueta.

## Pendientes de integración (Codex)

1. Arrancar el backend nuevo con la migración aplicada y abrir la app contra él: usuario con grupo y sin grupo, guardar/reanudar, cierre durante la partida, filtros y paginación.
2. Confirmar que el primer acceso con calendario vacío enseña «Sin quiz por ahora» y no un error.
3. Actualizar `state.md`/`decisions.md` con la parte de frontend al cerrar la integración (no se tocaron aquí para no pisar la edición en curso).
4. Aviso no bloqueante: `quiz-play.component.scss` supera en 0,5 kB el aviso de presupuesto de estilos por componente (como otras pantallas).
