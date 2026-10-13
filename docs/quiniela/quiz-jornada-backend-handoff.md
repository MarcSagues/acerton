# Quiz de jornada: entrega de backend para Opus

Fecha: 2026-10-12. Implementación de Codex. Interfaz y revisión visual a cargo de Opus; funcionalidad completa pendiente de integración.

## API implementada

El contrato v1 de `quiz-jornada-plan.md`, sección 6, está implementado sin cambios de campos o rutas. Las rutas son relativas a `/api`, protegidas por JWT; no requieren grupo.

- GET `/quiz/overview`: competiciones, quiz próximo abierto y último cerrado por competición.
- GET `/quiz/rankings`: general o liga, temporada, paginación, empates con posición compartida y fila propia.
- GET `/quiz/:quizId`: preguntas fijas y respuestas propias, sin respuestas ajenas.
- POST `/quiz/:quizId/participation`: inicio idempotente, devuelve detalle.
- PUT `/quiz/:quizId/answers`: guardado parcial atómico, devuelve detalle.
- POST `/quiz/:quizId/complete`: confirma cuestionario completo y permite editar antes del cierre.

`answers` admite entre 1 y 10 elementos. Se rechazan IDs de preguntas ajenas, opciones incompatibles y preguntas duplicadas en el lote. No enviar userId ni groupId; el DTO los rechaza. La API conserva los códigos de error acordados y traduce los mensajes según Accept-Language.

`questionCount` es real: normalmente 10; con un único partido son 8 preguntas diferentes. `matchCount` es el número de encuentros utilizados. No fijar diez en el cliente.

Una pregunta RESOLVED tiene correctOption y pointsEarned. Una sin respuesta obtiene 0 cuando se resuelve. Una PENDING o VOID mantiene correctOption/pointsEarned en null; las anuladas se cuentan aparte. No inferir aciertos del marcador en directo.

## Implementación y calendario

Código en `backend/src/quiz/`: reglas, DTO, controlador, servicio y procesos automáticos. Módulo registrado en AppModule. Modelos propios QuizEvent/QuizQuestion/QuizParticipation/QuizAnswer; nunca reutilizan Prediction o RankingSnapshot.

- Selección estable de hasta diez encuentros, Barcelona/Madrid/Liverpool primero y otros destacados después.
- Preguntas persistidas una única vez por jornada; no se regeneran para cada usuario.
- Publicación solo de jornadas importadas y habilitadas por MatchdaysService.canAcceptPredictions, antes de iniciarse cualquier partido.
- Cierre por el primer partido de toda la jornada, no solo los seleccionados; también por estado LIVE/FINISHED. lockedAt es irreversible.
- Escrituras serializadas con bloqueo de fila del evento y comprobación antes y después del guardado para evitar respuestas tardías.
- Puntos recalculados desde respuestas, con correcciones de resultados y recuperación tras reinicio.
- QuizJobs mantiene las seis competiciones con ID externo válido, sin depender de grupos. Calendarización cada diez minutos, backoff de tres horas por liga cuando no hay datos o falla el proveedor; refresco local cada minuto; revisión diaria de finales de los últimos siete días a las 03:00 de Europe/Madrid.
- El proceso existente de resultados ya consulta jornadas cerradas globalmente, incluidas las importadas por el evento. El quiz consume esas actualizaciones.
- Cola compartida en FootballDataOrgProvider: separación de 6,5 segundos entre llamadas y cooldown ante 429. Es un límite por proceso; servidores con varias réplicas o consumidores externos de la misma clave necesitan coordinar el cupo fuera del proceso.
- Conference, con externalId=0, no se ofrece. Sin clave de fútbol no se inventan quizzes; se siguen procesando datos locales existentes.

Los endpoints no consultan el proveedor. Abrir la interfaz con un calendario vacío puede mostrar "sin jornada" mientras termina la importación inicial en segundo plano. Si una jornada ya estaba empezada al instalar la funcionalidad, no se publica un quiz retroactivo para ella.

## Migración y preparación del entorno

Nueva migración aditiva: `backend/prisma/migrations/20261012140000_global_quiz/migration.sql`.

Aplicar las migraciones en la base de datos del entorno elegido **antes** de arrancar el backend nuevo y regenerar el cliente Prisma. El código compila, pero un servidor anterior seguirá devolviendo 404 para estas rutas y una base sin migración no tiene las tablas.

En esta entrega se aplicaron las cuatro migraciones únicamente en la base aislada local `acerton_quiz_test` del contenedor MySQL, no en la base habitual de la app ni en producción. Los fixtures de prueba se limpian al terminar; no hay partidos inventados sembrados en el entorno habitual.

La generación estándar de Prisma encontró un motor DLL en uso por un proceso local. Para las comprobaciones se generó un cliente temporal y se copiaron los archivos generados conservando el motor instalado, tras verificar que su hash era idéntico. No se detuvo el servidor del usuario. En un build limpio sigue siendo suficiente el flujo habitual `prisma generate`.

## Verificación

- Build backend correcto.
- 480 tests del backend pasan en 35 suites, incluidas las 42 comprobaciones nuevas del quiz y de la cola del proveedor.
- Ocho tests de integración con MySQL real y servidor Nest HTTP local: JWT/401, DTO anidado, códigos de error e idioma, acceso sin grupo, selección compartida, guardado, privacidad, cierre, concurrencia, puntuación/correcciones y rankings.
- Migración aplicada correctamente en el entorno local aislado.
- No se consultó football-data.org real ni se comprobó la interfaz del quiz contra un backend desplegado.
- El lint estándar del checkout tiene errores preexistentes por CRLF frente a LF. Comprobación adicional de los 176 archivos backend aceptando finales de línea del checkout (`endOfLine: auto`): 0 errores y 0 advertencias. No se reescriben archivos ajenos para corregir ese formato.

Para repetir las pruebas de integración, configurar explícitamente TEST_QUIZ_DATABASE_URL apuntando a la base local `acerton_quiz_test` y ejecutar Jest con `--runInBand`. Las pruebas rechazan hosts remotos y cualquier otro nombre de base; sin esa variable la suite de integración se omite. Las pruebas unitarias normales no necesitan base de datos ni clave de fútbol.

## Pendientes de integración

1. Aplicar la migración y arrancar el backend nuevo en el entorno local elegido para revisar la interfaz.
2. Opus conecta su cliente al contrato real; el modelo/servicio frontend presentes durante esta entrega coinciden con las rutas y campos revisados.
3. Revisar en móvil el recorrido de alguien sin grupo, guardar/reanudar, cierre durante participación y filtro de clasificación.
4. Verificar importación con el proveedor real y documentar cualquier diferencia de disponibilidad/calendario, especialmente Champions.
5. La revisión de correcciones automáticas cubre los finales de los últimos siete días. Una corrección más antigua requiere refrescar el partido localmente; el quiz recalcula sus puntos al detectar el cambio.

No se hizo despliegue, commit ni push en esta entrega.
