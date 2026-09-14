# Roadmap para Claude — Competitivo y Elo de Acerton

Fecha: 2026-09-13. Estado: planificación; ninguna fase implementada.

## Encargo y forma de trabajar

Preparar un modo competitivo oficial de pronósticos de fútbol con un duelo
por jornada y rating Elo. Este documento es el handoff de implementación
para Claude. El usuario ha pedido preparar el roadmap, no implementar ni
publicar el competitivo en esta sesión.

Antes de implementar, leer `CLAUDE.md`, `docs/quiniela/state.md`,
`product-rules.md`, `decisions.md` y el código vigente. Este roadmap añade
un frente independiente; no reemplaza ni renumera los sprints existentes.
Las reglas siguientes son propuestas de diseño, no acuerdos históricos
del usuario. Cuando se solicite implementar este roadmap, usarlas como
base y registrar cualquier ajuste con su motivo. No pedir confirmación
por decisiones técnicas rutinarias. Consultar solo contradicciones de
producto que no puedan resolverse con el contexto autorizado.

Trabajar por incrementos verificables. Al cerrar cada incremento, actualizar
el seguimiento al final de este archivo y registrar cambios relevantes en
`history.md` y `decisions.md`. Actualizar `state.md` si pasa a ser el frente
activo. No marcar pruebas nativas como realizadas por haber compilado web.
Publicación, servicios de pago y migraciones en producción son pasos
separados que necesitan la autorización correspondiente.

## Objetivo del MVP

Un usuario entra en Competitivo, completa su boleto, lo confirma antes del
cierre y recibe un rival de nivel parecido. Sigue el marcador durante la
jornada y, al liquidarse, ve su resultado, cambio de Elo y rango.

Alcance inicial:

- La Liga y modo 1X2, con el mismo conjunto de partidos para todos.
- Un punto por acierto, cero por fallo, sin comodines.
- Una entrada por cuenta y ronda competitiva; independiente de sus grupos.
- Un duelo por ronda, emparejamiento automático y asíncrono.
- Elo, rangos, clasificación global del formato e historial.
- Acceso también para usuarios sin grupos.

Fuera del MVP: resultado exacto, más ligas, copas, revancha elegida por el
usuario, premios, temporadas competitivas con reinicio, notificaciones
nuevas, copia de boletos desde grupos, controles avanzados contra multicuentas
y modificaciones al sistema de puntos o trofeos sociales.

## Contexto comprobado en el repositorio

| Pieza actual | Uso o precaución |
|---|---|
| `backend/prisma/schema.prisma` | `Prediction` pertenece obligatoriamente a un grupo. Crear entradas competitivas propias; no inventar un grupo global. |
| `backend/src/predictions/scoring.util.ts` | El 1X2 social da un punto por acierto; extraer/reutilizar lógica pura compatible sin permitir comodines en competitivo. |
| `backend/src/matchdays/matchday.util.ts` | `isMatchPredictable` permite editar hasta el kickoff individual. Competitivo requiere un corte global propio. |
| `backend/src/matchdays/matchdays.service.ts` | La finalización actual exige todos los partidos `FINISHED`; un aplazado puede mantener la jornada pendiente. |
| `backend/src/jobs/jobs.service.ts` | Hay resultados provisionales y definitivos; `newlyFinished` solo informa de transiciones nuevas. No basta para recuperar una liquidación fallida. |
| `backend/src/rankings/rankings.service.ts` | Recalcula snapshots incluso durante la jornada. No usar esos recálculos para aplicar Elo. |
| `frontend/src/app/features/` | Angular con componentes, facades y servicios existentes; seguir estos patrones y el diseño actual. |

Revisar también que la sincronización de La Liga funcione sin grupos con esa
competición activa. El competitivo debe mantener su calendario y resultados
mediante la caché y el proveedor existentes, sin lecturas externas por visita.

## Reglas propuestas que debe concretar la fase C0

### Boleto y cierre

- La ronda fija sus partidos y fecha de cierre antes de abrir. Cierra como
  máximo al comienzo del primer partido incluido; todas las fechas se
  almacenan en UTC y se muestran según la zona del usuario.
- Una ronda ya abierta nunca reabre por retrasos del calendario. Si un
  partido se adelanta, impedir pronósticos con información del resultado;
  excluirlo para todos si el adelanto invalida el cierre anunciado. Registrar
  el cambio y aplicar el mínimo de partidos válidos descrito abajo.
- Borrador y confirmación explícita. Solo un boleto completo y confirmado
  participa. Puede editarse o retirarse antes del cierre; editar invalida
  la confirmación y la interfaz debe dejarlo claro.
- Comparar la hora del servidor con el cierre en cada escritura, aunque el
  job todavía no haya cambiado el estado. Confirmación y edición deben
  resolver carreras mediante versión del boleto y transacción.
- Nadie ve pronósticos ajenos antes del cierre, tampoco mediante API.
- Tras el cierre no se admiten cambios ni retiradas del duelo.
- No confirmar implica no jugar y no cambiar Elo. Una vez confirmado y
  cerrado, no hace falta volver a conectarse para que el duelo cuente.

### Emparejamiento

- Al cierre, congelar participantes y rating de emparejamiento.
- Ordenar por Elo con desempate estable y emparejar niveles cercanos.
  Evitar al rival de la ronda anterior cuando haya alternativas razonables;
  documentar el criterio exacto y el resultado con poblaciones pequeñas.
- MVP sin límite duro de diferencia: si hay pocos jugadores se amplía el
  rango y se muestra la diferencia real. Nadie elige rival.
- Con número impar, asignar una plaza sin rival priorizando a quien menos
  veces la haya recibido; desempate estable. Con uno, queda sin rival;
  con cero, no se crean duelos. Sin rival no hay Elo ni victoria gratuita.
- Restricciones en base de datos impiden dos duelos para la misma entrada,
  jugar contra uno mismo y emparejar dos veces al repetir el job.

### Resultado, aplazados y correcciones

- Más aciertos = victoria; mismos aciertos = empate. El margen no modifica
  Elo. Los partidos excluidos se eliminan para ambos jugadores por igual.
- Propuesta de liquidación: esperar como máximo 72 horas después del último
  kickoff previsto al abrir la ronda. Ese plazo queda congelado.
- Al vencer el plazo, excluir partidos sin resultado definitivo. Exigir al
  menos el 70 % de los partidos originales, redondeando hacia arriba: con
  diez, al menos siete. Si no se alcanza, anular la ronda sin cambios de Elo.
  Un resultado posterior de un partido excluido no reactiva esa ronda.
- Mantener separado el estado de ronda competitiva del `Matchday` social:
  las reglas anteriores no deben finalizar artificialmente jornadas sociales.
- Antes de liquidar, refrescar resultados y validar que no se decide sobre
  una sincronización fallida. Si el proveedor falla, reintentar; la falta de
  datos no debe convertirse automáticamente en anulación deportiva.
- Correcciones oficiales de partidos incluidos tras liquidar: guardar una
  nueva revisión y recalcular ratings posteriores en orden estable. No
  limitarse a sumar/restar el cambio antiguo, porque cambia las expectativas
  de duelos posteriores. Registrar antes/después y motivo. Para el MVP basta
  un procedimiento administrativo reproducible; no hace falta una pantalla.
- No reemparejar rondas ya cerradas tras una corrección histórica.

### Elo y rangos

- Rating inicial 1000; K fijo de 24. Primeros cinco duelos válidos con
  etiqueta «En calibración», sin un K distinto inicialmente.
- Para A contra B: `EA = 1 / (1 + 10 ** ((RB - RA) / 400))`;
  `deltaA = 24 * (SA - EA)`, con SA = 1, 0.5 o 0. Para B, delta opuesto.
- Calcular ambos cambios con ratings previos, nunca con uno ya actualizado.
  Guardar con precisión decimal definida; redondear solo al presentar.
  No añadir suelo artificial de rating ni puntos por participación.
- Separar el snapshot usado para emparejar del rating usado para liquidar.
  Liquidar rondas por `(closesAt, id)`, usando el rating resultante de las
  anteriores. Una ronda posterior puede mostrar resultado deportivo pero
  queda pendiente de Elo mientras una anterior siga pendiente.
- Rangos iniciales propuestos: Bronce <1000; Plata [1000,1200);
  Oro [1200,1400); Platino [1400,1600); Diamante >=1600.
  Son umbrales de arranque, sujetos a simulación y revisión antes del piloto.
- Tabla pública tras cinco duelos válidos y con participación en alguna de
  las últimas cuatro rondas liquidadas. Inactividad oculta de la tabla, no
  resta rating. Empates de rating comparten posición.
- Sin reinicio entre temporadas futbolísticas en el MVP. Guardar historial
  de rating y mejor rango, sin alterar el contador de campeonatos sociales.

## C0 — Contrato de producto y diseño técnico

Depende de: autorización para empezar la implementación.

- [ ] Contrastar este documento con la rama y código vigentes.
- [ ] Registrar reglas finales y ejemplos de ciclo completo, empate, plaza
  sin rival, adelanto, cancelación, aplazado y corrección histórica.
- [ ] Definir estados, invariantes, contratos API y navegación sin grupos.
- [ ] Validar el acceso a calendario/resultados con independencia de grupos.
- [ ] Simular Elo y emparejamiento con 0, 1, 2, 3, 10 y 100 participantes,
  muchos empates y diferencias grandes de nivel. Revisar rangos iniciales.

Aceptación: ningún caso común depende de una decisión implícita; dejar
cerradas las reglas necesarias para C1. Documentar límites de población y
que el Elo necesita muchas jornadas para estabilizarse.

## C1 — Dominio y persistencia

Depende de: C0.

Modelo orientativo; Claude debe adaptarlo a Prisma y las invariantes:

| Entidad | Responsabilidad |
|---|---|
| `CompetitiveFormat` | Competición, modo y versión de reglas; un formato activo inicialmente. |
| `CompetitiveRound` | Jornada fuente, fechas congeladas, estado y revisión de liquidación. |
| `CompetitiveRoundMatch` | Conjunto original, kickoff de referencia y exclusiones justificadas. |
| `CompetitiveEntry` | Usuario, ronda, borrador/confirmación, versión y plaza sin rival. |
| `CompetitivePick` | Una elección 1X2 por entrada y partido incluido. |
| `CompetitiveDuel` | Dos entradas, resultado deportivo, snapshots y estado de liquidación. |
| `CompetitiveRating` | Rating por usuario/formato, duelos válidos y datos de presentación. |
| `CompetitiveRatingEvent` | Antes/después, delta, ronda, duelo, revisión y versión del algoritmo. |

- [ ] Migración aditiva, índices y unicidades. No convertir picks sociales
  históricos en Elo ni rellenar supuestos resultados competitivos.
- [ ] Funciones puras para resultado, Elo, rango y emparejamiento.
- [ ] Garantizar exclusividad de participantes también bajo concurrencia;
  dos columnas de rival con índices únicos independientes no bastan para
  impedir que una entrada aparezca una vez a cada lado.
- [ ] Definir transacciones, bloqueo de liquidación por formato y revisión
  activa de eventos. No borrar el rastro de correcciones.

Aceptación: migración local y generación Prisma correctas; pruebas de
invariantes y de conservación de suma de Elo dentro de cada duelo.

## C2 — Inscripción, boleto y emparejamiento por API

Depende de: C1.

- [ ] Crear/abrir rondas y consultar la actual sin necesitar grupos.
- [ ] Guardar borrador, confirmar completo y retirar antes del cierre.
- [ ] Validación de cuenta, formato, partido, hora y versión en servidor.
- [ ] Cerrar y emparejar mediante trabajo persistente y reintentable.
- [ ] Endpoints de estado propio y duelo con autorización por usuario.
- [ ] Feature flag de servidor para habilitar el piloto.

Aceptación: dos cuentas llegan a un duelo; tercera queda sin rival;
doble confirmación no duplica inscripción; cierre concurrente con edición
no introduce picks tardíos; no se filtran picks ajenos antes del cierre.

## C3 — Resultados, liquidación y recuperación

Depende de: C2. Es la fase de mayor riesgo.

- [ ] Marcador provisional con los resultados compartidos ya sincronizados.
- [ ] Resolver partidos excluidos, plazo máximo y rondas anuladas.
- [ ] Liquidación transaccional: resultado, eventos y ambos ratings.
- [ ] Trabajo recuperable por estado pendiente, no solo por `newlyFinished`.
  Un reinicio tras marcar la jornada terminada no debe perder la liquidación.
- [ ] Orden estable entre rondas y exclusión mutua entre workers.
- [ ] Procedimiento de corrección y replay desde la primera ronda afectada.
- [ ] Logs identificables por ronda/duelo y consulta de trabajos fallidos.

Aceptación mediante pruebas de integración con base de datos:

- Repetir diez veces una liquidación genera un único efecto activo.
- Dos workers simultáneos no duplican eventos ni sobrescriben ratings.
- Fallo intermedio revierte la transacción; el reintento la completa.
- Reiniciar después de recibir resultados recupera pendientes.
- Una jornada posterior que termina antes respeta el orden de Elo.
- Corrección antigua reproduce el historial como un cálculo limpio con los
  resultados corregidos, manteniendo los emparejamientos originales.
- Aplazados, cancelados y caída de proveedor respetan las reglas de C0.

## C4 — Experiencia completa en Angular

Depende de: C2; integración final depende de C3.

- [ ] Acceso «Competitivo» y explicación breve de reglas y cierre.
- [ ] Boleto 1X2 con estado de guardado, confirmación y error recuperable.
- [ ] Duelo con marcador, partidos pendientes y pronósticos distintos.
- [ ] Resultado final, delta de Elo, rango, calibración e historial.
- [ ] Clasificación pública y Elo en perfil, sin confundirlo con puntos
  sociales, trofeos o contador de campeonatos.
- [ ] Estados vacíos: sin ronda, borrador, no inscrito, sin rival, ronda
  anulada, resultado pendiente y Elo pendiente por ronda anterior.
- [ ] Textos en español de España, móvil, teclado y colores accesibles.

Aceptación: recorrido completo probado en navegador real con varias
cuentas; recargar conserva estado; errores de red no aparentan confirmación;
marcador provisional nunca se presenta como Elo definitivo.

## C5 — Validación y piloto

Depende de: C3 y C4.

- [ ] Ejecutar pruebas pertinentes y builds de backend/frontend.
- [ ] Probar flujo social para detectar regresiones en picks, rankings y
  usuarios sin grupos; comprobar que su cierre individual sigue igual.
- [ ] Verificar web y, por separado, iOS y Android en dispositivo o simulador.
  Registrar plataforma, evidencia y limitaciones reales.
- [ ] Ensayar migración y recuperación en entorno de prueba con autorización.
- [ ] Piloto con flag: preparar activación limitada y reversión de acceso.
  Deshabilitar nuevas inscripciones no debe detener liquidaciones pendientes.
- [ ] Medir inscritos, confirmaciones, plazas sin rival, diferencia de Elo,
  rivales repetidos, empates, fallos de liquidación y retorno siguiente ronda.
- [ ] Entregar pasos de despliegue y recuperación. Publicar solo cuando se
  solicite; no marcar como desplegado por tener código terminado.

Aceptación: sin defectos que alteren ratings, permitan picks tardíos o
expongan boletos; recuperación ensayada y validación por plataforma explícita.

## Evolución posterior, según datos del piloto

1. Copiar picks 1X2 desde un grupo, exigiendo completar comodines con una
   elección simple y confirmar el boleto oficial.
2. Avisos de rival y resultado, integrados con preferencias y deduplicación.
3. Temporadas competitivas y recompensas cosméticas con elegibilidad propia.
4. Más formatos con rating independiente cuando haya suficiente población.
5. Mejoras de emparejamiento y detección de abuso basadas en datos reales.

## Estimación orientativa

Prototipo: 3–5 días, sin considerarlo listo para usuarios. MVP sólido:
aproximadamente 2–3 semanas de trabajo de alguien familiarizado con el repo;
puede ampliarse por replay de correcciones, integración o validación nativa.
Reestimar al terminar C0. No sacrificar idempotencia, privacidad ni cierres
para cumplir la estimación. Temporadas, premios y notificaciones amplían
el alcance y se estiman aparte.

## Seguimiento para retomar

| Fase | Estado | Evidencia / siguiente paso |
|---|---|---|
| C0 | Pendiente | Revisar reglas propuestas al comenzar implementación. |
| C1 | Pendiente | Sin migraciones ni código competitivo. |
| C2 | Pendiente | Depende de C1. |
| C3 | Pendiente | Depende de C2. |
| C4 | Pendiente | Puede comenzar tras C2; cerrar integración después de C3. |
| C5 | Pendiente | Depende de C3 y C4. |

En cada sesión añadir: archivos modificados, pruebas ejecutadas y resultado,
decisiones nuevas, validación por plataforma y siguiente acción concreta.

## Prompt de arranque para Claude

> Lee CLAUDE.md y docs/quiniela/competitive-roadmap.md, junto con el contexto
> de producto que indican. Quiero implementar el MVP competitivo por fases.
> Contrasta el código actual, completa C0 y continúa con C1 si no hay una
> contradicción de producto que requiera mi decisión. Sigue las reglas
> propuestas, registra los ajustes y entrega incrementos verificables.
> Mantén actualizado el seguimiento y explica qué se ha probado. No
> publiques ni apliques migraciones en producción sin mi autorización.
