# Backlog — preguntas abiertas, ambigüedades y ampliaciones aplazadas

No bloquean el sprint activo salvo que se indique lo contrario. Cuando una
pregunta se resuelva, mover el resultado a `decisions.md` y borrarla (o
marcarla resuelta) de aquí.

## Preguntas que hay que resolver con el usuario antes de cada sprint afectado

- **Sprint 5 (temporadas)**: el encargo pide "orden estable de jornadas
  por cierre de pronósticos, independiente de la llegada de resultados" y
  explícitamente pide **explicar y resolver antes de implementar** los
  casos donde eso cambie resultados. Sin datos reales de qué casos
  simultáneos aparecen (dos jornadas de competiciones distintas cerrando
  en el mismo instante, por ejemplo), no se puede completar este análisis
  desde una sesión de preparación — queda como primer paso técnico real
  del Sprint 5, no como algo ya resuelto.
- **Sprint 6 (empates para trofeos)**: `product-rules.md` da ejemplos
  concretos (2 primeros → 2 platas + 1 bronce siguiente; 3 primeros → 3
  bronces; 4 primeros → nadie; 1 primero + 2 segundos → 1 oro + 2 bronces).
  Antes de implementar hay que confirmar cómo asigna `position` hoy
  `RankingSnapshot` en caso de empate (dense rank, posición compartida,
  o algo distinto) — no se ha verificado ese detalle en esta sesión.
- **Sprint 8 (insignias globales)**: al migrar `UserBadge` de scope por
  grupo a global, ¿qué `earnedAt` se conserva cuando el mismo usuario ya
  ganó la misma insignia en varios grupos? Propuesta razonable: la fecha
  más antigua (fue quien primero la desbloqueó). Confirmar con el usuario
  antes de escribir la migración, porque es una decisión que afecta a
  datos reales de usuarios ya existentes.
- **Sprint 8 ("Jornada perfecta" → "En lo más alto")**: ¿se mantiene la
  condición actual (premia a todos los empatados en el 1º puesto semanal)
  o se cambia a "en solitario" como dice el nuevo catálogo? Si se cambia
  la condición, los desbloqueos ya existentes con empate dejarían de ser
  válidos según la nueva regla — hay que decidir si se conservan igualmente
  (regla "conservar desbloqueos existentes durante migraciones" del
  encargo) o se recalculan.
- **Sprint 9 (notificaciones + hosting)**: Render (plan gratuito) se
  "duerme" cuando no hay tráfico — confirmar si eso afecta a la precisión
  de recordatorios en franjas nuevas (24h) antes de prometer puntualidad.
  No se ha investigado a fondo en esta sesión; si hiciera falta
  infraestructura de pago o un servicio adicional, requiere autorización
  explícita del usuario antes de contratarlo.
- **Sprint 7 (subida de foto propia)**: no existe ningún almacenamiento de
  imágenes hoy (sin S3/Cloudinary/similar, sin `multer`, Render sin disco
  persistente utilizable). El catálogo de avatares (mascota + color) no lo
  necesitaba porque son assets estáticos del propio frontend, pero "subir
  una foto del carrete" sí requiere decidir un proveedor (coste, cuenta,
  credenciales) antes de escribir código — igual que se hizo con el
  entorno dev/pre (ver `roadmap.md` § Infraestructura). No investigado a
  fondo en esta sesión: pendiente de traer opciones concretas (coste,
  límites del plan gratuito si lo hay) cuando el usuario quiera retomar
  este punto.

## Notas de contraste que no son bloqueantes pero conviene tener presentes

- El icono actual de acceso a ajustes de grupo es de "sliders", no una
  rueda literal — funcionalmente ya cumple el propósito de la regla
  ("ajustes accesibles mediante icono dedicado"); decidir en Sprint 2 si
  merece la pena cambiar el icono en sí.
- "Historial reciente" entre dos usuarios que comparten grupo: el usuario
  indica que esta lógica ya existe. Lo más parecido encontrado en el
  código es la vista de resultados de jornada ajena
  (`/matchday/:matchdayId/results/:userId`, `matchday-results` con
  `viewingSelf = false`) — a confirmar con el usuario si es exactamente
  eso o algo distinto antes de "ajustar su presentación" en el Sprint 7.
- La notificación de "jornada terminada con resultado y posición" y el
  envío de recordatorios "solo si faltan pronósticos" parecen existir ya
  a nivel de intención (según comentarios de `jobs.service.ts` y el
  README), pero no se ha verificado el comportamiento exacto en tiempo de
  ejecución en esta sesión — marcado como "🟡 probable" en `roadmap.md`,
  a confirmar en el Sprint 9.

## Entorno dev/pre (ver `roadmap.md` § Infraestructura)

Resuelto el 2026-09-10 (ver `decisions.md`): datos de prueba (no copia de
producción), acceso solo para el usuario y su compañero.

Pendiente: esta sesión no tiene tokens de API de Cloudflare ni de Render —
los pasos de Render (subir producción a Starter, crear el Web Service de
dev)/Cloudflare Pages/Access necesitan que el usuario los ejecute él mismo
desde el panel, o que comparta acceso (token de API) en una sesión futura
para hacerlo desde aquí. El paso de Neon (crear la rama `dev`) sí se puede
hacer desde esta sesión en cuanto el usuario confirme que se ejecute.

## Hallazgo pendiente de investigar (encontrado en verificación de Sprint 1, no relacionado con sus tareas)

- Al confirmar "Cerrar sesión" aparecen 2 errores 401 en consola sobre
  `POST /api/auth/refresh`. El logout en sí funciona bien (cierra sesión y
  navega a `/login` correctamente) — es solo ruido de consola, no un fallo
  visible para el usuario. Hipótesis sin confirmar: algún intento de
  refresco de token (interceptor HTTP o temporizador) que coincide en el
  tiempo con el borrado de tokens del logout. No se ha investigado la
  causa ni se ha tocado código relacionado con auth en esta sesión — fuera
  de alcance del roadmap de producto, pero merece un vistazo rápido en
  algún momento por higiene (evitar ruido de errores en consola/Sentry si
  hubiera).
- El backend local se cayó una vez (proceso terminado, no solo un 500)
  durante esta sesión en `rankings.service.ts`: `createMany` de
  `RankingSnapshot` violó su restricción única
  `(groupId, competitionId, matchdayId, period, userId)` — probablemente
  una carrera entre dos ejecuciones del cron de recálculo, agravada por
  el volumen inusual de grupos de prueba creados en esta sesión (QA de
  Sprint 2/3). No se ha investigado la causa raíz ni tocado ese servicio;
  no relacionado con el trabajo de esta sesión, pero conviene revisarlo
  antes de que un patrón similar ocurra en producción con datos reales.

## Push en iPhone (app nativa) — pasos manuales pendientes (ver `decisions.md` 2026-09-13)

Código ya cambiado (`App.entitlements`, `AppDelegate.swift`,
`FcmTokenPlugin.swift` nuevo, `push-notifications.service.ts`), pero **no
compilado ni probado** — sin Mac/Xcode en esta sesión.

Hecho ya (2026-09-13, vía navegador con el usuario viendo/interviniendo en
los pasos que requerían su cuenta):

- App iOS registrada en Firebase (proyecto `acerton-39f07`, bundle id
  `app.piqo.es`, alias "Piqo iOS"), `GoogleService-Info.plist` descargado
  y copiado a `frontend/ios/App/App/GoogleService-Info.plist` (todavía
  **no añadido al target del proyecto Xcode** — falta hacerlo desde
  Xcode, ver más abajo).
- Clave de autenticación APNs creada en Apple Developer (Keys → "Piqo APNs
  Key", Key ID `MD98CT3X9Z`, Team ID `L8A488AW3G`, entorno "Sandbox &
  Production", Team Scoped) y subida a Firebase Console → Cloud Messaging
  → Piqo iOS, en las dos filas (desarrollo y producción). El archivo
  `.p8` descargado se queda solo en el Downloads del usuario — **no se ha
  commiteado al repo** (a diferencia de `GoogleService-Info.plist`, esta
  clave privada no debe ir a git; si se pierde, hay que revocarla y crear
  una nueva en Apple Developer, ya que solo se puede descargar una vez).

Sigue pendiente, todo dentro de Xcode (no se puede hacer sin Mac):

1. Target `App` → Signing & Capabilities → añadir capacidad "Push
   Notifications" (`+ Capability`). Con firma automática, esto además
   habilita el servicio en el App ID `app.piqo.es` de Apple Developer.
2. Añadir Firebase iOS SDK como dependencia de paquete Swift **del
   proyecto Xcode `App.xcodeproj`** (proyecto, no target → pestaña
   "Package Dependencies" → `+` → `https://github.com/firebase/firebase-ios-sdk`
   → productos `FirebaseCore` y `FirebaseMessaging`, target `App`). No
   vale editar a mano `CapApp-SPM/Package.swift` — ese paquete es otro
   target y además Capacitor lo regenera con `npx cap sync ios`.
3. Añadir el `GoogleService-Info.plist` ya presente en
   `frontend/ios/App/App/` al proyecto Xcode (arrastrar o "Add Files to
   App…", "Copy items if needed" desmarcado ya que el archivo ya está en
   su sitio, target `App` marcado).
4. Compilar, probar en dispositivo físico real (push no funciona en
   simulador) desde Ajustes → Activar notificaciones → botón "Probar
   notificaciones", y confirmar que el signal `error` de
   `PushNotificationsService` no muestra nada y que `notification_tokens`
   recibe una fila nueva.
5. Repetir el archivado/build de release antes de subir a TestFlight — el
   `aps-environment` del build de distribución debe quedar en
   `production` (Xcode lo hace automático con firma automática y el
   provisioning profile correcto; comprobar que no se quede en
   `development` en el IPA final). Como la clave APNs ya cubre "Sandbox &
   Production", no hace falta tocar nada en Firebase para esto.

Hasta que se complete esto, el issue de Sprint 9 (#14) sigue sin la
verificación en iOS que exige "Reglas generales" de la skill.

## Ampliaciones futuras (no forman parte del roadmap actual)

- Hook de recordatorio (`Stop` u otro) para sugerir `/quiniela cerrar` al
  terminar una sesión — descartado en Sprint 0 por fragilidad y porque el
  encargo pide no prometer detección automática (ver `decisions.md`).
  Reconsiderar solo si el usuario lo pide explícitamente.
- Marcos de avatar opcionales (1/3/5/10 campeonatos) — el propio encargo
  los marca como "evaluar después de perfil e insignias" y "no
  implementar como parte obligatoria sin decisión posterior". No se
  incluyen como sprint numerado; retomar la conversación tras el Sprint 8.
