# Backlog — preguntas abiertas, ambigüedades y ampliaciones aplazadas

No bloquean el sprint activo salvo que se indique lo contrario. Cuando una
pregunta se resuelva, mover el resultado a `decisions.md` y borrarla (o
marcarla resuelta) de aquí.

## Preguntas que hay que resolver con el usuario antes de cada sprint afectado

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

## Push en iPhone (app nativa) — estado y siguiente paso (ver `decisions.md` 2026-09-13)

Commit `9bc1952` en `fix/ios-push-notifications`. El build de esta app
**no usa Xcode interactivo**: se hace con `.github/workflows/ios-build.yml`
(`workflow_dispatch`, runner `macos-latest`, `xcodebuild archive` +
`-exportArchive` a TestFlight, firma manual con certificado/perfil en
secretos del repo). Por eso todo lo necesario se ha cableado directamente
en el repo en vez de dejarlo como "hazlo en Xcode":

- `App.entitlements`: añadida `aps-environment`.
- `AppDelegate.swift`: reenvía el registro/error de APNs a Capacitor,
  configura Firebase, capta el token FCM.
- `FcmTokenPlugin.swift` (nuevo): plugin nativo que expone ese token al JS.
- `push-notifications.service.ts`: en iOS usa ese plugin; Android no cambia.
- `project.pbxproj`: editado a mano (sin Xcode) para que el build de CI
  compile de verdad todo esto — `GoogleService-Info.plist` añadido a la
  fase Resources, `FcmTokenPlugin.swift` a Sources, y **Firebase iOS SDK
  añadido como `XCRemoteSwiftPackageReference`** (`firebase-ios-sdk`,
  productos `FirebaseCore` + `FirebaseMessaging`, `upToNextMajorVersion`
  desde 11.0.0) en el proyecto `App.xcodeproj` — no en `CapApp-SPM`, que
  `npx cap sync ios` regenera en cada build y habría perdido la
  dependencia. `xcodebuild archive` resuelve este paquete remoto solo
  (el runner tiene acceso a red), sin pasos extra.
- `GoogleService-Info.plist`: app iOS registrada en Firebase (proyecto
  `acerton-39f07`, bundle id `app.piqo.es`, alias "Piqo iOS"), archivo
  descargado y commiteado en `frontend/ios/App/App/` (no es secreto,
  igual que el de Android).
- Clave de autenticación APNs creada en Apple Developer (Keys → "Piqo APNs
  Key", Key ID `MD98CT3X9Z`, Team ID `L8A488AW3G`, entorno "Sandbox &
  Production", Team Scoped) y subida a Firebase Console → Cloud Messaging
  → Piqo iOS (desarrollo y producción). El `.p8` **no se ha commiteado**
  (a diferencia del plist, esta clave privada no va a git; si se pierde,
  hay que revocarla y crear una nueva, solo se descarga una vez).
- Capacidad "Push Notifications" del App ID `app.piqo.es`: ya estaba
  activada en Apple Developer desde antes de esta sesión (comprobado
  directamente). El perfil de aprovisionamiento "App Store" **"Piqo"**
  usado por la Action ya la incluye (`aps-environment: production`
  verificado tanto en el perfil descargado hoy como en uno de 2026-09-12).
  Por si acaso, se ha vuelto a descargar y **actualizado el secreto
  `IOS_PROVISIONING_PROFILE_BASE64`** del repo `MarcSagues/acerton` con la
  versión de hoy (con autorización explícita del usuario) — no debería
  haber sido necesario, pero elimina cualquier duda sin coste.

**Sin compilar ni probar en dispositivo real** — no hay Mac/Xcode en esta
sesión, así que nada de esto se ha visto compilar. Siguiente paso
concreto: lanzar `.github/workflows/ios-build.yml` a mano (pestaña
Actions → "iOS Build" → "Run workflow"), instalar el `.ipa` resultante (o
esperar a que llegue a TestFlight) en un iPhone real, y desde Ajustes →
Activar notificaciones → botón "Probar notificaciones" comprobar que
llega el aviso y que aparece una fila nueva en `notification_tokens`. Si
el build de CI falla, el error de `xcodebuild archive`/`-exportArchive`
en los logs de Actions es el primer sitio donde mirar — puede indicar un
problema en el cableado del pbxproj que no se pudo verificar sin Xcode.

Hasta que se pruebe en dispositivo real, el issue de Sprint 9 (#14) sigue
sin la verificación en iOS que exige "Reglas generales" de la skill.

## Ampliaciones futuras (no forman parte del roadmap actual)

- Hook de recordatorio (`Stop` u otro) para sugerir `/quiniela cerrar` al
  terminar una sesión — descartado en Sprint 0 por fragilidad y porque el
  encargo pide no prometer detección automática (ver `decisions.md`).
  Reconsiderar solo si el usuario lo pide explícitamente.
- Marcos de avatar opcionales (1/3/5/10 campeonatos) — el propio encargo
  los marca como "evaluar después de perfil e insignias" y "no
  implementar como parte obligatoria sin decisión posterior". No se
  incluyen como sprint numerado; retomar la conversación tras el Sprint 8.
