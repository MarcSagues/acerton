# Plan de reorganización de perfiles

Fecha: 2026-09-13. Estado: estructura indicada por el usuario; métricas nuevas propuestas, sin cambios de aplicación.

## Objetivo

Convertir el perfil ajeno en una ficha útil para conocer al jugador y su
rendimiento en el grupo compartido. Reorganizar el perfil propio alrededor
de la misma identidad y estadísticas, conservando sus ajustes existentes.
Este documento no da por aprobadas las nuevas métricas ni implementa Elo.

Antes de implementar, leer CLAUDE.md, state.md, product-rules.md y el estado
real de los sprints de perfil, estadísticas, insignias y premios. Integrar
este trabajo con ellos para no crear implementaciones paralelas. Las
observaciones siguientes proceden del código local, no de una comprobación
de la versión publicada ni de una sesión de navegador.

## Qué se ve hoy al visitar a un miembro

Ruta: `/groups/:groupId/members/:userId`.

| Información | Comportamiento actual |
|---|---|
| Identidad | Nombre e iniciales; no muestra avatar elegido. |
| Pertenencia | Administrador/Miembro y mes/año de incorporación al grupo. No distingue propietario. |
| Racha | Actual del grupo; si vale cero se renderiza vacío. |
| Aciertos | Porcentaje redondeado de pronósticos puntuados con puntos > 0, dentro del grupo, sin filtro de temporada. |
| Insignias | Cantidad y medallas genéricas de las obtenidas en ese grupo; descripción en atributo title. |
| Jornadas | Hasta cinco snapshots semanales recientes: número, posición y puntos. Pulsar abre sus resultados. |

El endpoint también devuelve mejor racha y nombre, código y fecha de las
insignias, pero la pantalla no aprovecha toda esa información. Las jornadas
se ordenan por cierre y no filtran FINISHED ni participación real: pueden
incluir resultados provisionales o filas a cero de quien no participó. No
identifican competición en la presentación.

No aparecen posición/puntos generales del grupo, volumen de pronósticos,
mejor racha, desglose 1X2/exactos, comparación contigo, temporadas, trofeos
reales, insignias favoritas ni Elo. El acceso exige que visitante y jugador
pertenezcan al grupo. El endpoint no devuelve correo ni otros grupos.

## Problemas de significado a corregir

- «Aciertos» significa actualmente cualquier pronóstico que da puntos. En
  EXACT_SCORE incluye acertar solo el signo (2 puntos) y el marcador (5).
  En 1X2 incluye dobles oportunidades. No presentarlo como precisión de
  resultado exacto ni como precisión 1X2 simple.
- Mostrar 0 para rachas nulas; «Sin datos» para porcentajes sin denominador.
- Identificar grupo, competición, periodo y modo de las estadísticas.
- El historial de un jugador no es todavía una comparación entre dos
  jugadores; esta última requerirá cálculo nuevo.
- La vitrina propia usa el catálogo TROPHIES y el detalle de temporada
  declara datos de demostración. No trasladar esos ejemplos al palmarés
  real de otra persona.

## Organización indicada por el usuario

Pantalla principal en este orden vertical: **Cabecera → Trofeos → Logros →
botón Estadísticas → botón Histórico**. Los dos botones serán filas completas
con texto y flecha, reutilizando el estilo de los ajustes del perfil propio.
Cada uno abre una vista independiente; no usar pestañas. Las estadísticas
y listas de jornadas se consultan dentro de esas vistas.

### Cabecera compartida

Avatar real con fallback de iniciales, nombre y hasta tres insignias
favoritas cuando esa funcionalidad exista. En perfil propio, conservar las
acciones de edición. En ajeno, contexto del grupo y pertenencia. Mostrar
contador de campeonatos solo cuando exista el dato real según las reglas
de premios ya acordadas. No mostrar bloques vacíos de Elo futuro.

### Trofeos y Logros en la pantalla principal

- Primero la vitrina de trofeos reales, con grupo, temporada y categoría
  en su detalle. Sin datos, estado vacío honesto; no mostrar premios demo.
- Después Logros: insignias con arte existente y detalle accesible al
  pulsar, no solo hover.
- Integrar insignias globales/favoritas cuando estén disponibles. No sumar
  concesiones repetidas como insignias únicas.

### Vista Estadísticas

Botón arriba a la izquierda con flecha y texto «Volver al perfil». Mostrar
título «Estadísticas» y nombre del jugador. Organizar el contenido así:

1. Contexto «En [grupo]», temporada y competición seleccionadas. Al entrar
   desde la tabla, conservar sus filtros cuando sean válidos. Si todavía no
   hay datos fiables por temporada, etiquetar «Histórico disponible».
2. Cuatro cifras principales: posición, puntos, precisión con denominador
   y racha actual. Debajo, mejor racha y jornadas participadas/disponibles.
3. «Tú y [nombre]»: comparación agregada de jornadas comunes terminadas,
   cuántas quedaste por delante, empataste o por detrás y tamaño de muestra.
   Esta comparación sigue siendo una ampliación propuesta.

### Vista Histórico

Botón arriba a la izquierda con flecha y texto «Volver al perfil». Mostrar
título «Histórico» y nombre del jugador.

- Lista paginada con competición, jornada, fecha, puntos, posición y estado.
- Diferenciar «No participó», «En curso» y resultado definitivo.
- Acceso a resultados del jugador conservando explícitamente groupId;
  revisar la ruta actual, que solo pasa matchdayId y userId y puede depender
  del grupo activo. Volver restaura contexto y filtros.
- Filtros comunes a las métricas. No mezclar dos jornadas J5 de ligas
  distintas ni dar apariencia definitiva a puntos provisionales.

### Navegación y perfil propio

En ambas vistas, volver al perfil exacto de origen, conservando userId y
groupId; para el propio, volver a `/profile`. El botón estará arriba a la
izquierda también al abrir por enlace directo. No depender exclusivamente
de history.back(), que podría llevar fuera de la app o a otro jugador.
Conservar filtros y posición de lista al regresar desde resultados.

En perfil propio usar la misma estructura. La comparación con uno mismo se
oculta. Conservar los ajustes privados existentes después de estos bloques;
este cambio no exige crear otra pantalla de Ajustes. Editar nombre/avatar
puede reutilizar los flujos actuales. No exponer correo ni acciones privadas
al visitar a otro.

## Definición de las métricas propuestas

- Posición/puntos: misma fuente y reglas de empate que Tabla, mismo ámbito.
- 1X2: separar «Acierto simple» y «Con comodín», cada uno con su numerador
  y denominador de pronósticos resueltos. No contar pendientes como fallos.
- Exacto: «Signo acertado» incluye exactos; «Marcador exacto» solo igualdad
  de ambos goles. Mostrar ambos sobre pronósticos resueltos del modo.
- Participación: respetar las reglas acordadas de incorporación y jornadas
  disponibles; no derivar ausencia de una simple puntuación cero.
- Comparación: solo jornadas finalizadas del mismo grupo y competición en
  las que ambos pronosticaron. Comparar puntos de esa jornada, conservar
  empates y mostrar tamaño de muestra. Es comparación de resultados sociales
  y puede incluir comodines; no llamarla duelo oficial ni usarla para Elo.
- Temporadas: no atribuir retrospectivamente pronósticos a una temporada
  si faltan límites fiables. Revisar la agregación actual antes de habilitar
  el filtro; un campo groupSeasonId en snapshots no garantiza que la suma
  original ya esté limitada a esa temporada.

## Plan de implementación por incrementos

### P1 — Reorganización con datos actuales

- [ ] Reutilizar app-avatar y añadir avatarUrl/avatarBackground al DTO ajeno.
- [ ] Cabecera coherente en perfil propio y ajeno; contexto del grupo visible.
- [ ] Mostrar mejor racha, cero real y errores de carga con reintento.
- [ ] Insignias con ilustración y detalle existente.
- [ ] Añadir competición y estado a jornadas; revisar navegación con groupId.
- [ ] Orden principal: cabecera, Trofeos, Logros, Estadísticas e Histórico.
- [ ] Dos botones con el estilo de ajustes que abren vistas independientes.
- [ ] Vuelta arriba a la izquierda en ambas vistas al perfil de origen,
  incluso desde enlaces directos.
- [ ] Conservar ajustes privados del perfil propio después de estos bloques.
- [ ] Etiquetar la precisión actual honestamente mientras llega P2.

Aceptación: no se pierde información ni acceso a ajustes, avatar correcto,
cero visible, detalle usable en móvil y resultados abiertos en el grupo correcto.
Ambas vistas tienen vuelta arriba a la izquierda al perfil correcto y no se
implementan como pestañas.

### P2 — Vista Estadísticas y métricas fiables

- [ ] Contrato de métricas con numerador, denominador, ámbito y periodo.
- [ ] Posición/puntos coherentes con Tabla y separación simple/comodín/exacto.
- [ ] Participación y filtros, integrando trabajo existente de estadísticas.
- [ ] Pruebas de pendientes, cero aciertos, signos/exactos, comodines,
  varias competiciones, incorporación tardía y cambio de temporada.

Aceptación: cada cifra se puede explicar y reproducir con datos de prueba;
no hay mezcla de temporadas ni comparación de modos incompatibles.

### P3 — Vista Histórico y comparación en Estadísticas

- [ ] Añadir visitante al cálculo de comparación, validado por autenticación.
- [ ] Comparación agregada en Estadísticas con empates y muestra explícita.
- [ ] Historial paginado y estado de no participación/provisional/final.
- [ ] Conservar filtros y contexto al navegar y regresar.

Aceptación: fixture conocido reproduce por delante/empates/por detrás;
sin jornadas comunes aparece estado vacío; no se incluyen grupos ajenos.

### P4 — Logros y componentes compartidos

- [ ] Integrar favoritos/globalización y trofeos cuando sus sprints estén listos.
- [ ] Compartir presentación sin reutilizar respuestas privadas de cuenta.
- [ ] Eliminar demos del recorrido de logros reales o mantenerlas únicamente
  en una vista explícita de demostración.
- [ ] Futuro: Elo/rango mediante datos reales del competitivo; no bloquea P1–P3.

Aceptación: cada logro mostrado tiene respaldo persistido y permiso de
visibilidad. Grupos privados no compartidos no se revelan mediante sus nombres
o detalles de premios sin una regla de visibilidad explícita.

## Verificación y límites

Mantener autorización en servidor para perfiles y resultados. No exponer
pronósticos que aún puedan editarse; revisar la política por kickoff real.
Probar rutas directas, cambio de grupo activo y pérdida de membresía. Evitar
traer todo el histórico por visita: agregaciones e historial paginado.

Verificar interfaz en navegador real, tamaños móviles y teclado. Registrar
iOS/Android por separado, sin darlos por probados por compilar. Actualizar
seguimiento del roadmap existente al implementar; no reabrir trabajo ya hecho.

## Próximo paso

Implementar P1 cuando se solicite. P2 y P3 añaden información nueva; P4
depende de las funcionalidades de logros existentes y pendientes. Ningún
incremento requiere que el competitivo esté implementado previamente.
