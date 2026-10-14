# Quiniela

Quiniela de futbol semanal para grupos de amigos. Monorepo con npm workspaces: `backend` (NestJS + Prisma + MySQL) y `frontend` (Angular 18 + Material + PWA).

## Requisitos

- Node 20+ (probado con Node 22)
- Docker (para MySQL local) o una instancia MySQL propia

## Arranque en local

```bash
npm install

# Base de datos
docker compose up -d
cp backend/.env.example backend/.env   # edita DATABASE_URL si no usas el docker-compose por defecto
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend

# Backend (http://localhost:3000/api)
npm run dev:backend

# Frontend (http://localhost:4200)
npm run dev:frontend
```

## Variables de entorno relevantes (`backend/.env`)

- `DATABASE_URL` / `DIRECT_URL`: conexion a MySQL (en produccion y dev, MySQL de Hostinger; ver `backend/.env.example`).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: obligatorias, cualquier string en dev.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`: login con Google (opcional en dev; sin configurar, ese boton simplemente fallara contra la API de Google).
- `FOOTBALL_DATA_API_KEY`: clave de [football-data.org](https://www.football-data.org/) para sincronizar jornadas y resultados reales. Sin ella, las jornadas no se sincronizan (la app funciona igual, pero "jornada actual" quedara vacia hasta configurarla). `FOOTBALL_DATA_BASE_URL` tiene un valor por defecto (`https://api.football-data.org/v4`) y normalmente no hace falta tocarlo.
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`: credenciales de servicio (Admin SDK) para que el backend pueda *enviar* notificaciones push. Sin configurar, el envio se desactiva silenciosamente (se loguea un aviso al arrancar). Se sacan de Firebase Console > Project settings > Service accounts > Generate new private key.
- `DASHBOARD_API_KEY`: clave compartida con el dashboard de administracion (dashboard.piqo.es, repo `piqo-dashboard`) para que pueda enviar una notificacion push a todo el mundo (`POST /api/dashboard/send-notification`, ver "Notificaciones desde el dashboard" mas abajo). Minimo 32 caracteres aleatorios (`openssl rand -hex 32`); el MISMO valor va en el dashboard como `DASHBOARD_API_KEY`. Sin configurar (o mas corta), ese endpoint responde 503.
- `COMEBACK_ENABLED_DEFAULT` / `COMEBACK_POINTS_PER_BONUS_DEFAULT`: valores por defecto al crear un grupo para el comodin de remontada (doble oportunidad 1X/X2/12) — cada admin puede activarlo/desactivarlo y ajustar el segundo valor despues desde los ajustes del grupo. La cantidad de usos disponibles se recalcula cada semana segun la diferencia de puntos con el lider (ver `WildcardsService.getComebackStatus`), no es un cupo fijo de temporada.

## Notificaciones push (Firebase Cloud Messaging)

Backend y frontend usan el mismo proyecto de Firebase pero con credenciales distintas:

- **Backend** (envia): variables `FIREBASE_*` de arriba (Admin SDK, secretas).
- **Frontend** (recibe): config *publica* del proyecto (protegida por las reglas de Firebase, no por ocultarla) en 3 sitios que deben coincidir:
  1. `frontend/src/environments/environment.ts` y `environment.prod.ts` — objeto `firebase` (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `vapidKey`).
  2. `frontend/public/firebase-messaging-sw.js` — mismo `apiKey`/`authDomain`/`projectId`/`storageBucket`/`messagingSenderId`/`appId` (este archivo se sirve tal cual, no pasa por el sistema de environments de Angular, asi que hay que editarlo a mano).

  Los valores salen de Firebase Console > Project settings > General > "Your apps" (crea una app Web si no existe) para todo menos `vapidKey`, que sale de Project settings > Cloud Messaging > Web Push certificates (genera un par de claves si no hay ninguna).

Sin esta config (`vapidKey` vacio), el boton "Activar" de notificaciones en Perfil se oculta y se muestra "No configuradas en este entorno" — no rompe nada, simplemente no hay push. El service worker de FCM se registra en un scope propio (`/firebase-cloud-messaging-push-scope`) para no chocar con el service worker de la PWA (`ngsw-worker.js`, que sigue controlando el resto de la app para cache offline).

### Notificaciones desde el dashboard

El dashboard de administracion (`piqo-dashboard`) puede mandar una notificacion push a todos los usuarios. Solo lee la BD con un usuario `SELECT`; el envio lo hace este backend:

- `POST /api/dashboard/send-notification` con la clave en la cabecera `X-Dashboard-Key` y cuerpo `{ title, body, dryRun? }` (`dryRun: true` solo cuenta a cuantos llegaria, sin enviar). Sin JWT de usuario: lo protege `DashboardApiKeyGuard` (503 sin `DASHBOARD_API_KEY` configurada, 403 si la clave no coincide) y esta limitado a 5 peticiones por minuto.
- Envia a todos los dispositivos registrados, por lotes de 500 (limite de FCM). **No respeta las preferencias de aviso** y **no crea aviso en la pantalla "Avisos"** (ver `docs/quiniela/decisions.md`). Sin Firebase configurado responde 503 en vez de simular un envio; los tokens que FCM da por invalidos se borran.

## Jobs programados

El backend corre en segundo plano (`@nestjs/schedule`, ver `src/jobs/jobs.service.ts`):
- Sincroniza la jornada en curso de cada competicion usada por algun grupo (cada 12h).
- Envia los recordatorios de cierre (5h / 1h / 30min antes) a quien todavia no ha completado su quiniela (cada 5 min).
- Cierra jornadas cuyo plazo ha pasado (cada 1 min, no llama a la API) y sincroniza resultados (cada 10 min); al finalizar una jornada dispara puntuacion, clasificaciones, rachas, insignias y la notificacion de resultados publicados.

### Cupo de football-data.org (plan gratuito: 10 peticiones/minuto, sin limite diario)

Los partidos y resultados se guardan siempre en MySQL (`Matchday`/`Match`); el proveedor externo solo se consulta para *rellenar* esa cache, nunca se lee en caliente desde los endpoints que usa el frontend. Ademas:

- **Jornada en curso** (`MatchdaysService.syncCurrentRound`): si ya hay una jornada no finalizada guardada para la temporada, no se vuelve a pedir — solo se pide una jornada nueva cuando la anterior termina (o no hay ninguna todavia). En condiciones normales esto es 0 peticiones la mayoria de las veces que corre el cron.
- **Resultados** (`MatchdaysService.syncResultsForClosedMatchdays`): junta los partidos pendientes de *todas* las jornadas cerradas (de cualquier competicion) en una sola tanda de peticiones a `/matches?ids=...` (maximo 20 ids por peticion, se trocea si hace falta), en vez de una peticion por jornada. Tambien se salta partidos cuyo kickoff todavia no ha llegado.
- **Cola compartida**: las solicitudes de grupos y quiz global se separan al menos 6,5 segundos dentro del proceso del proveedor; un 429 aplica cooldown segun Retry-After (60 segundos si falta). Con varias replicas o consumidores externos de la misma clave hace falta coordinar el cupo entre procesos.
- Nota: football-data.org no cubre la UEFA Conference League en ningun plan (ver comentario en `prisma/seed.ts`); esa competicion queda con un `externalId` placeholder y su sincronizacion simplemente no devuelve partidos.

### Quiz global por jornada

El servidor ofrece un evento por liga y jornada, con preguntas variadas y rankings general/por liga independientes de los grupos. API autenticada bajo `/api/quiz`. El quiz se abre al habilitarse esa jornada y se cierra para todos al primer partido de toda la ronda. Las respuestas y puntos viven en tablas propias.

Antes de arrancar el backend nuevo, aplicar la migracion `20261012140000_global_quiz` y regenerar Prisma. Estado, contrato y preparacion para conectar la interfaz: [entrega de backend](docs/quiniela/quiz-jornada-backend-handoff.md) y [plan](docs/quiniela/quiz-jornada-plan.md). La validacion de esta entrega usa una base MySQL local aislada; no modifica produccion.

## Idiomas (español, inglés, catalán, francés, italiano y alemán)

El idioma original es el español. Para añadir o cambiar un texto de la interfaz:

1. Añade la clave en `frontend/src/app/core/i18n/es.ts` y su traducción en `en.ts`, `ca.ts`,
   `fr.ts`, `it.ts` y `de.ts` (todos están tipados: si falta o sobra una clave, no compila).
2. En plantillas: `{{ 'seccion.clave' | t }}` o `{{ 'seccion.clave' | t: { name } }}`;
   en TypeScript: `t('seccion.clave', { name })`. Los marcadores son `{name}`, y un
   mensaje con singular/plural es `{ one: '...', other: '...' }` con el parámetro `count`
   (en francés el singular también vale para el 0: la forma `one` lleva `{count}`).
3. Los errores del backend se lanzan en español (`throw new NotFoundException('...')`);
   su traducción va en `backend/src/common/i18n/messages/<idioma>.ts`, uno por idioma
   (un test falla si falta). Los correos están en `backend/src/mail/email-copy/<idioma>.ts`.

El idioma lo elige el usuario en Perfil > Apariencia (o el del dispositivo si no ha
elegido: ca, fr, it, de, en o es, con cualquier región; cualquier otro, español) y el
frontend lo manda al backend en `Accept-Language`.

Solo el español va en el paquete inicial: el catálogo del idioma elegido (y los datos de
fechas de Angular) se descargan antes de arrancar la app (`core/i18n/language-loader.ts`,
`main.ts`), así que el resto del código no sabe nada de cargas asíncronas. Los avisos
push y los de la pantalla "Avisos" se siguen generando en español (hace falta guardar el
idioma de cada usuario para cambiarlo).

## Historial de versiones (novedades)

`frontend/src/app/core/changelog/changelog.ts` es el historial de versiones de la app. La
primera vez que se abre una versión nueva, un pop-up enseña sus cambios (una vez por
versión y dispositivo). Cada cambio visible para el usuario añade una línea (en español e
inglés; catalán, francés, italiano y alemán son opcionales: si falta uno, el pop-up sale en
inglés) a la entrada de arriba; al subir de versión se crea una entrada nueva arriba y se
pone la misma versión en `MARKETING_VERSION` del proyecto iOS (`node scripts/check-changelog.mjs`
lo comprueba, también en CI).

## Tests

```bash
npm run test:backend
```

Cubren la logica de calculo de puntos, el comodin de remontada (gap de puntos, allowance, activacion por grupo) y el cierre/finalizado de jornadas.
