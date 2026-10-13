# Quiz de jornada: plan y reparto de implementación

Fecha: 2026-10-12. Estado: backend implementado y probado; frontend asignado a Opus; integración visual pendiente. Seguimiento del servidor en `quiz-jornada-backend-handoff.md`.

## 1. Objetivo y alcance acordado

Evento para todos los usuarios de Piqo, independiente de los grupos. Un quiz por competición y jornada, con preguntas variadas sobre sus partidos, corrección automática y clasificación general y por liga.

Requisitos del usuario:

- Acceso desde el botón inferior derecho, donde ahora está Perfil.
- Elegir liga e iniciar el quiz; debajo, clasificación general con filtro por liga.
- Cubrir 10 partidos por jornada y priorizar siempre los encuentros de Barcelona, Real Madrid, Liverpool y los equipos destacados de cada competición.
- Abrir cuando se habiliten los pronósticos de esa jornada y cerrar al empezar el primer partido de esa jornada de esa liga.
- Participación global, sin necesidad de pertenecer a un grupo.
- Preguntas variadas, no una quiniela formada únicamente por 1X2.

Interpretación operativa propuesta: hasta 10 partidos reales de la misma jornada y 10 preguntas. Si hay menos partidos, se usan todos y se distribuyen varias preguntas diferentes entre ellos. No inventar encuentros ni mezclar jornadas. Diez preguntas, puntuación uniforme y acumulación por temporada son decisiones propuestas en este plan, no requisitos expresos del usuario.

## 2. Punto de partida del proyecto

- Backend NestJS + Prisma + MySQL; frontend Angular 18 con componentes standalone, facades, signals y componentes visuales propios.
- FootballDataOrgProvider ya proporciona jornada, equipos, escudos, hora, estado y marcador. Reutilizar esos datos; no hacen falta estadísticas adicionales.
- MatchdaysService.canAcceptPredictions expresa la habilitación de una jornada, pero no basta para cerrar un quiz: actualmente los pronósticos de grupo pueden seguir abiertos para partidos posteriores al primero. Añadir la comprobación del cierre global del quiz.
- Los procesos de sincronización de jornadas actuales se basan en competiciones utilizadas por grupos. El evento necesita su propio catálogo de competiciones habilitadas y sincronización independiente de las membresías.
- El catálogo incluye La Liga, Premier, Serie A, Bundesliga, Ligue 1 y Champions. Conference tiene externalId=0 en el seed: no publicar quizzes de una competición sin fuente válida. Champions entra como competición aunque no sea liga regular; publicar solo rondas que el proveedor pueda identificar de forma consistente.
- El avatar de la cabecera ya abre Perfil; conservar ese acceso.
- Varias rutas y redirecciones asumen que el usuario tiene grupo. La independencia del evento requiere revisar login, welcome, guards y acceso al perfil, además de crear /quiz sin hasGroupGuard.
- Hay cambios locales anteriores a este trabajo. Inspeccionar git status y preservar modificaciones ajenas, especialmente resultados, estilos globales y changelog.

## 3. Reparto de trabajo y propiedad de archivos

### Codex: servidor, reglas y coordinación

- Modelos Prisma, migración aditiva y módulo backend/src/quiz/.
- Catálogo de ligas del evento y equipos destacados.
- Selección estable de partidos, generación y persistencia de preguntas.
- Apertura, cierre irreversible, validación y guardado de respuestas.
- Sincronización independiente de grupos, corrección y rankings.
- Contrato API de este documento y pruebas de reglas.
- Integración final y pruebas de extremo a extremo.
- Actualización de state.md, decisions.md y demás contexto del producto al implementar. Este plan no marca ninguna funcionalidad como terminada.

### Opus: experiencia e implementación frontend

- frontend/src/app/features/quiz/.
- frontend/src/app/core/models/quiz.model.ts y core/services/quiz.service.ts.
- Rutas /quiz y /quiz/:quizId, navegación inferior, acceso sin grupo y ajustes de redirección necesarios.
- Pantallas de inicio, preguntas y resultados; ranking general y por liga.
- Textos y accesibilidad en los seis idiomas actuales.
- Tests frontend, comprobación de build y revisión visual móvil.
- Una entrada de novedades en la versión actual del changelog, conservando el contenido existente.
- No modificar backend, Prisma ni las reglas de puntuación.

No atribuir a Opus ejecución desde Codex: su trabajo se realizará en una sesión externa de Claude con este repositorio. Sonnet es opcional para traducciones o pruebas rutinarias; no es una dependencia del plan.

## 4. Reglas del evento

### Calendario y selección

- Una única instancia por competición + temporada + jornada, compartida por todos los usuarios.
- La jornada tiene que estar habilitada por la regla de pronósticos existente. No introducir otra ventana de cuatro días.
- Elegir hasta 10 partidos antes de publicar: enfrentamientos entre destacados, encuentros con al menos un destacado, resto por kickoff e ID como desempate estable.
- Barcelona, Real Madrid y Liverpool son obligatorios cuando juegan en esa competición y jornada. Lista inicial propuesta para las demás: Atlético; Arsenal, Manchester City, Manchester United, Chelsea y Tottenham; Inter, Milan, Juventus y Napoli; Bayern y Dortmund; PSG y Marseille. El listado se configura en backend, nunca en la pantalla.
- Identificar equipos mediante IDs externos si se incorporan al mapeo; con el esquema actual, usar aliases explícitos y normalizados. Evitar búsquedas ambiguas como simplemente "Madrid".
- Fijar selección, tipos y opciones al publicar; no regenerar al abrir la pantalla ni cambiar preguntas entre jugadores.
- Mantener la misma versión de reglas para todos los participantes de un evento.

### Preguntas

Diez preguntas con variedad de tipos y sin duplicar la misma pregunta sobre un partido. Cada pregunta tiene opciones cerradas y vale un punto.

| Tipo estable | Pregunta | Opciones |
| --- | --- | --- |
| WINNER | ¿Quién ganará? | HOME, DRAW, AWAY |
| BOTH_SCORE | ¿Marcarán ambos equipos? | YES, NO |
| OVER_2_5 | ¿Habrá más de 2,5 goles? | YES, NO |
| HOME_CLEAN_SHEET | ¿El local terminará sin encajar? | YES, NO |
| AWAY_CLEAN_SHEET | ¿El visitante terminará sin encajar? | YES, NO |
| HOME_TWO_PLUS | ¿El local marcará dos o más goles? | YES, NO |
| AWAY_TWO_PLUS | ¿El visitante marcará dos o más goles? | YES, NO |
| WIN_BY_TWO_PLUS | ¿Algún equipo ganará por dos o más goles? | YES, NO |

Distribuir los tipos de manera determinista, con varias familias de preguntas por quiz y participación de todos los partidos seleccionados. En una jornada con muy pocos partidos, reducir el número de preguntas si no se pueden generar diez distintas con este catálogo y devolver questionCount real. Mostrar siempre ese número, nunca un 10 fijo en el cliente.

### Participación y cierre

- Solo requiere cuenta autenticada y onboarding de nombre cuando corresponda; no requiere grupo.
- Una participación por usuario y evento. Comenzar crea la participación, sin crear duplicados al reintentar.
- Guardar respuestas parciales y permitir modificarlas hasta el cierre. Un botón Finalizar confirma que se ha completado; las respuestas guardadas cuentan aunque no se pulse.
- Cierre = primer inicio de TODA la jornada, incluidos partidos que no fueron seleccionados.
- Validación en servidor en cada escritura, dentro de una operación que no acepte respuestas después del plazo; la hora del móvil no decide.
- Un partido en LIVE o FINISHED también obliga a cerrar si el horario guardado estuviera desfasado. Persistir el cierre para que un aplazamiento posterior no reabra el evento.
- Antes del inicio, recalcular el cierre cuando el proveedor confirme o cambie horarios. Tratar horas provisionales según la lógica existente; no presentar una hora provisional como confirmada.
- Al cerrar, conservar borradores guardados: cada pregunta sin respuesta obtiene cero puntos cuando se resuelve.

### Corrección y clasificación

- 1 punto por acierto; 0 por error o ausencia de respuesta. Sin relación con comodines, XP, badges ni rankings de grupo en esta primera versión.
- Corregir solo con partido FINISHED y ambos marcadores disponibles. No puntuar un marcador LIVE como definitivo.
- Partido aplazado: preguntas pendientes. Cancelación definitiva: preguntas anuladas, sin puntos y diferenciadas de las incorrectas; mostrar también total de preguntas válidas.
- Puntuación provisional a medida que se resuelven preguntas. Acumulación por temporada; ranking general suma todas las ligas, ranking de liga suma solo esa competición.
- Mostrar claramente que jugar varias ligas suma más oportunidades de puntos en la general.
- Empates a puntos comparten posición; ordenar visualmente los empatados por ID de usuario para paginación estable, sin convertir ese orden en desempate deportivo.
- Recalcular de forma idempotente, incluyendo correcciones del proveedor. El total deriva de respuestas puntuadas, no de incrementar contadores en cada sincronización.
- Lista paginada, solo identidad pública (ID, nombre y avatar), puntuación y quizzes jugados. Sin correos ni datos privados.
- Conservar temporadas anteriores y mostrar etiqueta de temporada. No sumar temporadas diferentes sin indicarlo.

## 5. Pantallas de Opus

### /quiz: centro del evento

1. Título y explicación breve: evento para toda la comunidad.
2. Selector de competición, con nombre y escudo cuando exista.
3. Tarjeta de jornada: número/nombre, estado, cierre, progreso propio y acción Iniciar / Continuar / Revisar respuestas / Ver resultados.
4. Si hay jornada nueva abierta y anterior en curso, priorizar iniciar la nueva y ofrecer revisar la anterior.
5. Debajo, clasificación: General por defecto, filtro de liga independiente del selector de juego, etiqueta de temporada y acceso a más posiciones.
6. Destacar la fila propia incluso si está fuera de la página actual.

### /quiz/:quizId: participación y resultados

- Una pregunta por paso con equipos, escudos, fecha, opciones, indicador X de N y botones anterior/siguiente.
- Guardado explícito de cada selección y estado Guardando / Guardado / No se pudo guardar. No avanzar como si se hubiera guardado tras un error.
- Reanudar con respuestas del servidor; al volver al centro, refrescar progreso.
- Al expirar el plazo, bloquear edición y refrescar el estado. Ante QUIZ_CLOSED en una escritura, mostrar cierre y conservar solo respuestas confirmadas por servidor.
- Pantalla final con resumen editable mientras siga abierto y resultados de solo lectura después: respuesta propia, correcta cuando exista, punto obtenido, pendiente o anulada.
- Carga, sin jornada, proveedor no disponible, error con reintento, ranking vacío y sin conexión tratados expresamente.
- Sin grupo: acceso real desde welcome y tras autenticación; Perfil accesible desde el avatar, con estados vacíos en secciones que dependan de grupo. Evitar ciclos de redirección.
- Reutilizar estilo, componentes, toast, avatar, iconos y sistema de traducción del proyecto; no añadir un diseño ajeno ni nuevas librerías por comodidad.

## 6. Contrato API v1 propuesto para trabajar en paralelo

Todas las rutas siguientes son relativas a environment.apiUrl (ya incluye /api), requieren autenticación y obtienen el usuario de la sesión. No enviar userId ni groupId en el cuerpo. Fechas ISO UTC, presentadas por el cliente en el locale del usuario.

```ts
type QuizStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'FINISHED';
type QuestionType = 'WINNER' | 'BOTH_SCORE' | 'OVER_2_5'
  | 'HOME_CLEAN_SHEET' | 'AWAY_CLEAN_SHEET'
  | 'HOME_TWO_PLUS' | 'AWAY_TWO_PLUS' | 'WIN_BY_TWO_PLUS';
type OptionCode = 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO';

interface QuizCompetition {
  id: string;
  code: string; // los CompetitionCode existentes
  name: string;
  logoUrl: string | null;
}
interface QuizSummary {
  id: string;
  competition: QuizCompetition;
  matchdayId: string;
  matchdayOrder: number;
  matchdayName: string;
  seasonLabel: string; // ej. "2026/27"
  status: QuizStatus;
  closesAt: string;
  kickoffConfirmed: boolean;
  questionCount: number;
  matchCount: number;
  participation: null | {
    answeredCount: number;
    completedAt: string | null;
    points: number;
    resolvedCount: number;
    voidCount: number;
  };
}
interface QuizMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string | null;
  awayTeamShort: string | null;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  kickoff: string;
  kickoffConfirmed: boolean;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}
interface QuizQuestion {
  id: string;
  order: number;
  type: QuestionType;
  match: QuizMatch;
  options: OptionCode[];
  selectedOption: OptionCode | null;
  resolution: 'PENDING' | 'RESOLVED' | 'VOID';
  correctOption: OptionCode | null;
  pointsEarned: number | null;
}
interface QuizDetail {
  serverNow: string;
  quiz: QuizSummary;
  canAnswer: boolean;
  questions: QuizQuestion[];
}
interface QuizRankingRow {
  position: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  points: number;
  quizzesPlayed: number;
}
interface QuizRanking {
  seasonLabel: string;
  competitionId: string | null; // null = general
  provisional: boolean;
  rows: QuizRankingRow[];
  me: QuizRankingRow | null;
  total: number;
  nextCursor: string | null;
}
```

| Método y ruta | Respuesta / comportamiento |
| --- | --- |
| GET /quiz/overview | `{ serverNow, competitions: QuizCompetition[], quizzes: QuizSummary[] }`; próxima elegible y última iniciada por competición, sin importar grupo. |
| GET /quiz/:quizId | QuizDetail con respuestas del usuario actual. |
| POST /quiz/:quizId/participation | QuizDetail; inicia de forma idempotente si se puede responder. |
| PUT /quiz/:quizId/answers | Cuerpo `{ answers: [{ questionId, option }] }`; aplica atómicamente el lote, actualiza solo esas preguntas y devuelve QuizDetail. |
| POST /quiz/:quizId/complete | QuizDetail; requiere todas las preguntas contestadas y quiz abierto; marca completedAt, sin bloquear futuras ediciones antes del cierre. |
| GET /quiz/rankings | QuizRanking; parámetros opcionales competitionId, seasonLabel, cursor y limit (20 por defecto, máximo 100). General si no hay competitionId. |

Registrar /overview y /rankings antes de /:quizId en el controlador. No exponer respuestas correctas antes de que una pregunta esté resuelta, ni respuestas de otros usuarios en detalle. No devolver corrección provisional basada en marcador en directo.

Errores: conservar el formato del proyecto y añadir `code` estable al cuerpo: QUIZ_NOT_FOUND (404), QUIZ_NOT_OPEN (409), QUIZ_CLOSED (409), QUIZ_INCOMPLETE (400), INVALID_QUIZ_ANSWER (400). Opus debe usar code para traducir el mensaje localmente y reutilizar el manejo existente de 401/red.

Contrato propuesto como referencia de implementación. Cualquier cambio debe anotarse aquí y coordinarse antes de modificar ambas partes. No sustituir la API real por mocks automáticos cuando falle una petición.

## 7. Persistencia y procesos a cargo de Codex

- QuizEvent: vínculo único a Matchday, temporada, estado, openedAt, lockedAt, versión de reglas; participantes y preguntas propios.
- QuizQuestion: evento, partido, orden, tipo, opciones y resolución; unicidad de orden por evento.
- QuizParticipation: evento, usuario, startedAt y completedAt; unicidad usuario + evento.
- QuizAnswer: participación, pregunta, opción, puntuación y updatedAt; unicidad participación + pregunta. Validar que pregunta y participación pertenecen al mismo evento.
- No reutilizar Prediction ni RankingSnapshot: ambos contienen reglas y referencias de grupo.
- Una migración aditiva; aplicar en el entorno de prueba antes de arrancar el servidor nuevo.
- Procesos de generación/sincronización para competiciones habilitadas sin depender de GroupCompetition. Reutilizar calendarios importados y sincronización de resultados; evitar descargar temporadas completas para cada acceso al quiz.
- Respetar el presupuesto de peticiones del proveedor con cola, caché, backoff y aislamiento de errores por liga. No lanzar una ráfaga de llamadas por cada visita.
- Recuperar generación, cierre y corrección tras reinicio; proteger creación y puntuación ante ejecuciones concurrentes.
- La consulta y cada escritura deben respetar el cierre real aunque no se haya ejecutado todavía el proceso periódico.

## 8. Fases y comprobaciones de aceptación

1. Codex fija modelos y contrato; Opus lee este documento y prepara servicio, tipos y vistas con fixtures de prueba aislados.
2. Desarrollo paralelo: Codex servidor y reglas; Opus pantallas y navegación, sin editar archivos de backend.
3. Conexión contra API real; retirar fixtures de la ejecución normal. Probar usuario con grupo y usuario sin ninguno.
4. Tests de servidor: destacados, menos de 10 partidos, preguntas distintas, mismo contenido para todos, cierre por partido fuera de selección, hora provisional, cambio horario, inicio anticipado, cierre irreversible, escritura concurrente al cierre, validación de opciones, duplicados, cancelados, resultados corregidos y rankings independientes de grupos.
5. Tests frontend: selector de juego y ranking independientes, guardar/reanudar, errores de guardado, cierre durante participación, entrada directa sin grupo, ranking vacío/paginado/fila propia, resultados pendientes y anulados.
6. Verificar builds backend y frontend, pruebas pertinentes y revisión móvil de pantallas largas, opciones y seis idiomas. No declarar validación visual sin haberla realizado.
7. Revisar migración, traducciones, novedades y documentación. Preparar entrega y especificar comprobaciones pendientes; no desplegar ni publicar como parte del encargo de planificación.

## 9. Límites de la primera entrega

Sin preguntas de goleadores, tarjetas, córners o posesión porque no son datos guardados actualmente. Sin premios monetarios, salas de grupo, administración de preguntas desde una pantalla ni bonificaciones de puntos. Cambios de catálogo de destacados y preguntas mediante configuración de código en esta primera versión.

Este documento se creó primero como planificación. El usuario autorizó después a Codex a implementar el backend; las reglas y el contrato de la sección 6 se mantienen. El prompt de Opus está en `quiz-jornada-opus-prompt.md` y el estado de la API en `quiz-jornada-backend-handoff.md`.
