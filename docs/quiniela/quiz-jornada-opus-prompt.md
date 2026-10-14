# Prompt para Opus

Implementa la parte frontend de «Quiz de jornada» en este repositorio Piqo/Acerton (Angular 18). Codex se encargará del backend, la base de datos, la generación/corrección de preguntas y las clasificaciones. Tu responsabilidad es la interfaz y su conexión al contrato acordado.

Antes de editar, lee `CLAUDE.md`, `docs/quiniela/state.md` y, completo, `docs/quiniela/quiz-jornada-plan.md`. Este último define alcance, reparto, reglas, pantallas y contrato API v1. Revisa también las convenciones reales de frontend, el sistema de componentes e idiomas y `git status`; existen cambios locales ajenos que debes conservar.

Implementa:

1. Centro `/quiz`: selector de liga, tarjeta de jornada con estado/cierre/progreso y acciones Iniciar, Continuar, Revisar respuestas o Ver resultados. Debajo, clasificación General por defecto con filtros por liga independientes del selector del quiz, temporada, paginación y fila propia.
2. Recorrido `/quiz/:quizId`: preguntas variadas sobre hasta diez partidos, una pregunta por paso, opciones, navegación, guardado, reanudación y resumen final. Usa questionCount real; no fijes diez en la interfaz. Todos los datos y puntos proceden del servidor.
3. Resultado de solo lectura con respuesta propia, respuesta correcta cuando esté resuelta, puntos, pendientes y anuladas. Gestiona cierre mientras se está jugando y error QUIZ_CLOSED al guardar.
4. Sustituye Perfil por Quiz en el botón inferior derecho. Conserva el acceso a Perfil desde el avatar que ya existe en la cabecera. Ajusta rutas, login/welcome/redirecciones y estados vacíos necesarios para que alguien sin grupo pueda llegar al evento y a su perfil, sin romper los flujos de grupos.
5. Tipos en `frontend/src/app/core/models/quiz.model.ts`, cliente HttpClient en `frontend/src/app/core/services/quiz.service.ts` y componentes/facades en `frontend/src/app/features/quiz/`. Sigue el contrato de la sección 6 del plan y usa environment.apiUrl. No envíes userId ni groupId.
6. Estados de carga, sin jornada, ranking vacío, sin conexión y error con reintento. Diferencia Guardando, Guardado y fallo; no muestres como guardada una respuesta que el servidor rechazó. Descarta respuestas tardías de peticiones al cambiar de liga y evita peticiones de ranking por cada tick del contador.
7. Accesibilidad, adaptación móvil y traducciones en es/en/ca/fr/it/de con las convenciones existentes. Renderiza la pregunta a partir de type y los equipos y las opciones a partir de sus códigos. Añade una línea de novedades a la versión actual, conservando los cambios existentes.

Límites de responsabilidad:

- No modifiques backend, Prisma, migraciones, puntuación ni catálogo de equipos destacados.
- No modifiques styles.scss o resultados de jornada salvo que sea estrictamente necesario; prioriza estilos locales porque hay trabajo ajeno en esos archivos.
- No cambies el contrato unilateralmente: si encuentras un problema, descríbelo y propón el ajuste explícito antes de depender de él.
- Si la API todavía no está implementada, usa fixtures solo en tests o en una modalidad de desarrollo explícita y aislada. Mantén el cliente real listo; no hagas fallback silencioso a datos inventados en ejecución normal. Informa de que la integración contra backend sigue pendiente.
- El servidor decide apertura, cierre y puntuación. El contador sirve para informar y bloquear controles mientras se refresca, no para inventar reglas locales. Puedes usar serverNow para ajustar el desfase del dispositivo.
- No conectes el quiz a puntuaciones, comodines, XP ni rankings de grupos.
- No añadas dependencias sin necesidad, no despliegues, no publiques y no hagas commit ni push salvo petición expresa.

Valida con tests frontend pertinentes y build. Si puedes revisar visualmente las pantallas, hazlo en tamaño móvil; especifica lo que realmente has comprobado. Entrega un resumen de archivos cambiados, comprobaciones ejecutadas, ajustes propuestos al contrato y pendientes de integración para Codex. No marques la funcionalidad completa si falta backend real.
