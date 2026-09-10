# Reglas de producto acordadas

Fuente: encargo del usuario del 2026-09-10 ("prompt de mejoras"). Este
documento es la referencia normativa de comportamiento deseado — no
garantiza que esté implementado. El contraste contra el código real vive
en `roadmap.md` (estado por tarea) y `backlog.md` (preguntas abiertas).

Contexto general: Acerton es un juego social gratuito de pronósticos de
fútbol en grupos, sin dinero real. Se implementa con ayuda de Claude. Los
sprints se agrupan por funcionalidades, no por semanas ni fechas. Todas las
funcionalidades deben verificarse en web, iOS y Android. La revisión
general de bugs queda aplazada; sí se resuelven regresiones introducidas
por este trabajo y problemas que bloqueen su alcance. Mantener el lenguaje
de la app en español de España y aprovechar los componentes y estilos
actuales.

## Tutorial

- Guía breve de los botones principales y lo necesario para empezar.
- Se inicia al entrar por primera vez en un grupo.
- Como seleccionar un grupo lleva a Tabla, puede empezar allí y explicar el
  acceso a Jornada.
- Adaptada al modo 1X2 o resultado exacto.
- Omitible y repetible desde Perfil.
- Estado persistido por cuenta, no solo por dispositivo.
- No reaparece en cada grupo.
- No obliga a enviar un pronóstico real.

## Pronósticos e interfaz

- En 1X2, eliminar spinner y tick de guardado.
- Animar el borde de la opción seleccionada desde que empieza el guardado
  hasta la confirmación del servidor.
- Mostrar verde cuando la última selección esté confirmada.
- Permitir cambiar la selección durante el guardado.
- Evitar que respuestas antiguas sobrescriban selecciones nuevas.
- Conservar la selección cuando falle y permitir reintentar.
- Añadir L y V sobre los campos local y visitante de resultado exacto.
- Textos: «La jornada se abre en» y «La jornada cierra en». Es un cambio de
  texto, no una nueva regla de apertura.
- Quitar el fondo de «Faltan X por enviar».
- Copiar enlace muestra una confirmación temporal «Copiado» únicamente si
  funciona. No vigilar el portapapeles.
- Cerrar sesión requiere un único modal de confirmación.

## Grupos y navegación

- Sin grupos: mostrar crear/unirse.
- Un grupo: entrar en Jornada.
- Varios grupos: entrar en Grupos.
- Pulsar un grupo lleva a su Tabla.
- Respetar destinos de enlaces directos.
- Preview del grupo: posición general del usuario.
- Destacar el grupo activo en el selector.
- Ajustes accesibles mediante una rueda.
- Crear grupo en un único formulario con todas las opciones, tanto para
  usuarios nuevos como existentes.
- En el flujo de cuenta nueva, mostrarlo sin la navegación habitual.
- Privado por defecto.
- Selector de dos opciones Público/Privado.
- Privacidad modificable posteriormente.
- Explicar el comodín con resumen y detalle ampliable coherentes con su
  cálculo real.
- Botón final del contenido, no fijo: «Crear grupo» o «Guardar cambios».
- Guardar desactivado si no hay cambios válidos o hay un guardado en curso.

## Permisos y membresías

- Creador: control completo, nombrar/quitar administradores, transferir
  propiedad y eliminar grupo.
- Administrador: editar ajustes y expulsar miembros normales.
- Administradores no pueden expulsar ni degradar a otros administradores o
  al creador.
- Miembros normales pueden ver opciones sin permiso, pero deshabilitadas.
- Aplicar permisos en backend, no solo en interfaz.
- Los miembros pueden salir con confirmación.
- El creador debe transferir propiedad o eliminar el grupo antes de salir.
- Eliminar retira el grupo de las vistas activas, conservando historia y
  trofeos concedidos.
- Salir o ser expulsado conserva resultados.
- Volver durante una temporada no reinicia la fecha inicial usada para
  calcular participación.
- Quien no sea miembro al cierre no recibe nuevos premios de esa temporada.

## Temporadas y participación

- Temporada futbolística, por ejemplo 2026/27.
- Los grupos siguen existiendo, con nueva clasificación y temporadas
  anteriores consultables.
- La temporada termina al finalizar todas las competiciones incluidas.
- Se pueden añadir competiciones durante la temporada, pero no quitar.
- Una competición añadida cuenta desde la primera jornada disponible para
  pronosticar, sin puntos ni ausencias retroactivas.
- Un pronóstico basta para participar en una jornada.
- Un candidato a premios debe participar en al menos el 50 % de sus
  jornadas disponibles desde su incorporación, incluyendo exactamente el
  50 %.
- Excluir jornadas que ya estaban cerradas al incorporarse.
- Se necesitan al menos tres participantes válidos para conceder premios.
- Sin ese mínimo, se conservan clasificación y estadísticas, pero no hay
  premios ni incrementos del contador.
- La tabla real conserva a todos. El reparto de premios se calcula entre
  candidatos elegibles.
- Si el líder no cumple el mínimo, el primer candidato elegible puede
  obtener el oro.

## Empates, trofeos y contador

Usar la última posición ocupada por cada bloque empatado:

- Dos primeros: dos platas; el siguiente puede recibir bronce.
- Tres primeros: tres bronces.
- Cuatro primeros: ninguno recibe premio de podio.
- Un primero y dos segundos: un oro y dos bronces.

Aplicar la regla tanto a distintivos de posición como a premios.
Identificar empates según la puntuación de la clasificación
correspondiente; no introducir desempates nuevos sin consultarlo.

- Destacar oro/plata/bronce en tarjetas de personas de Tabla según su
  clasificación general.
- Los trofeos se guardan en Perfil y son visibles en perfiles ajenos.
- El contador junto al nombre suma exclusivamente primeros premios
  generales de grupo ganados en solitario.
- Mostrar contador en Tabla y Perfil, oculto si vale cero.
- Los premios de competición no incrementan ese contador.
- Premios identificados por grupo, temporada, categoría y posición.
- No duplicar premios al repetir cierres o recalcular.

Catálogo inicial propuesto para desarrollar:

1. Podio general de temporada.
2. Podio de cada competición dentro del grupo: Liga, Champions, etc.
3. Podio de mayor número de aciertos 1X2.
4. Podio de mayor número de resultados exactos acertados.

Aplicar requisitos de participación y empates a todos. En premios de
competición, calcular participación sobre sus propias jornadas.

## Rachas y estadísticas

- Racha por grupo y racha global, ambas por jornadas.
- Global: cada jornada de cada competición presente en los grupos cuenta
  una vez.
- Una misma jornada repetida en varios grupos no se duplica.
- Pronosticar un partido de esa jornada en cualquiera de esos grupos
  cuenta.
- Dejar pasar una jornada de una competición sin participar rompe la racha
  global, aunque se participe en otra competición.
- Pausas sin jornadas y cambios de temporada no rompen la racha.
- Mostrar racha actual y mejor histórica, con títulos explicativos.
- Utilizar un orden estable de jornadas por cierre de pronósticos,
  independiente de la llegada de resultados. Si aparecen casos simultáneos
  cuyo tratamiento cambie resultados, explicarlos y resolverlos antes de
  implementar.
- Estadísticas por temporada, globales y filtrables por grupo.
- Separar 1X2 y resultado exacto.
- Incluir puntos, aciertos, porcentaje de acierto, jornadas participadas,
  mejor posición y rachas.
- En estadísticas, pronósticos del mismo partido en distintos grupos
  cuentan como participaciones independientes.
- No inventar métricas históricas si faltan datos.

## Perfil y avatares

- El nombre solo se cambia una vez cada siete días.
- Mientras no pueda cambiarse, mostrar el nombre actual dentro del input
  bloqueado y cuándo vuelve a habilitarse.
- Aplicar la restricción en servidor.
- Catálogo de avatares predeterminados.
- Asignar uno al registrarse sin añadir un paso obligatorio.
- Permitir subir foto, recortar y previsualizar circularmente.
- Sustituir foto o volver a un avatar del catálogo.
- Validar formato y tamaño, y retirar metadatos privados de la imagen
  publicada.
- Abrir perfiles desde nombre/avatar en Tabla.
- Perfiles ajenos muestran avatar, nombre, favoritas, trofeos,
  estadísticas y rachas, no datos privados.
- Si ambos usuarios comparten grupo, mostrar historial reciente. Esta
  lógica ya existe según el usuario: revisar y modificar principalmente su
  presentación, sin reescribirla innecesariamente.

## Insignias

- Globales por cuenta.
- Quitar referencias a «este grupo» donde ya no correspondan.
- Seleccionar y ordenar hasta tres favoritas, solo entre conseguidas.
- Favoritas visibles como logos bajo el nombre solo en Perfil.
- Pulsarlas abre descripción y porcentaje de usuarios que la tienen.
- Denominador: todos los usuarios registrados.
- Progreso numérico y barra cuando la condición sea medible.
- Conceder retroactivamente si los datos permiten comprobarlo.
- Si faltan datos, documentar desde cuándo se mide, sin inventar progreso.
- Conservar desbloqueos existentes durante migraciones.

Catálogo inicial propuesto; concretar las condiciones y deduplicación
antes de implementarlo:

- Primeros pasos: primer pronóstico.
- Constante: 5 jornadas consecutivas.
- Comprometido: 10 jornadas consecutivas.
- Incombustible: 25 jornadas consecutivas.
- Centenario: 100 pronósticos.
- Buen ojo: 25 aciertos 1X2.
- Experto en 1X2: 100 aciertos 1X2.
- Al milímetro: un resultado exacto.
- Francotirador: 10 resultados exactos.
- En racha: 5 aciertos seguidos en el mismo grupo y modo.
- En lo más alto: primero en solitario en una jornada.
- Campeón: primer premio general de temporada.

Verificar la insignia actual «Jornada perfecta»: si realmente premia un
primer puesto semanal, proponer renombrarla «En lo más alto» conservando
los desbloqueos. **Ver nota en `backlog.md`**: la condición actual de esa
insignia premia a todos los empatados en el primer puesto, mientras que el
nuevo catálogo la define como "en solitario" (sin empate) — son criterios
distintos, hay que decidir cuál se aplica al renombrar.

## Notificaciones

- Preferencias globales por cuenta y opción de silenciar grupos.
- Interfaz desplegable con controles independientes.
- Apertura de jornada: activada por defecto.
- Recordatorios antes del cierre de pronósticos: 24 h, 5 h, 1 h y 30 min;
  selección múltiple.
- Solo 1 h activado inicialmente.
- Recordatorios solo cuando falten pronósticos.
- Partido terminado con puntos ya calculados: desactivado por defecto y
  solo para partidos pronosticados.
- Jornada terminada con resultado y posición: activada.
- Insignia conseguida: activada.
- Temporada terminada y trofeos: activada.
- Agrupar en un aviso el mismo partido jugado en varios grupos.
- No enviar duplicados ni recordatorios antiguos al cambiar preferencias.
- No enviar avisos de grupos silenciados o abandonados.
- Distinguir permiso del dispositivo de preferencias de cuenta.
- Verificar que el alojamiento del backend permite la regularidad
  necesaria. No introducir infraestructura nueva sin justificarla y sin la
  autorización necesaria para servicios de pago.

## Marcos de avatar opcionales

Evaluar después de perfil e insignias:

- Marcos estáticos por 1, 3, 5 y 10 campeonatos generales.
- Selección, vista previa y opción de no usar marco.
- Documentar dificultad y dependencias.
- No implementarlos como parte obligatoria sin decisión posterior del
  usuario.

## Criterio de finalización (aplica a todos los sprints)

Cada sprint debe entregar: comportamiento implementado, pruebas
proporcionadas al riesgo, criterios de aceptación verificados, estado real
por plataforma, y documentación + siguiente paso actualizados.

No dejar toda la validación para el sprint final. No marcar validación
nativa como completada si solo se ha compilado o probado en navegador. Si
faltan dispositivo, credenciales o servicios, registrar exactamente qué
queda pendiente y continuar con lo que sí pueda completarse.

La publicación (deploy, build de store) es un paso separado, nunca
automático.
