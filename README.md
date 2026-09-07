# Quiniela

Quiniela de futbol semanal para grupos de amigos. Monorepo con npm workspaces: `backend` (NestJS + Prisma + PostgreSQL) y `frontend` (Angular 18 + Material + PWA).

## Requisitos

- Node 20+ (probado con Node 22)
- Docker (para Postgres local) o una instancia Postgres propia

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

- `DATABASE_URL`: conexion a Postgres.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: obligatorias, cualquier string en dev.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`: login con Google (opcional en dev; sin configurar, ese boton simplemente fallara contra la API de Google).
- `FOOTBALL_DATA_API_KEY`: clave de [football-data.org](https://www.football-data.org/) para sincronizar jornadas y resultados reales. Sin ella, las jornadas no se sincronizan (la app funciona igual, pero "jornada actual" quedara vacia hasta configurarla). `FOOTBALL_DATA_BASE_URL` tiene un valor por defecto (`https://api.football-data.org/v4`) y normalmente no hace falta tocarlo.
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`: credenciales de servicio (Admin SDK) para que el backend pueda *enviar* notificaciones push. Sin configurar, el envio se desactiva silenciosamente (se loguea un aviso al arrancar). Se sacan de Firebase Console > Project settings > Service accounts > Generate new private key.
- `COMEBACK_ENABLED_DEFAULT` / `COMEBACK_POINTS_PER_BONUS_DEFAULT`: valores por defecto al crear un grupo para el comodin de remontada (doble oportunidad 1X/X2/12) — cada admin puede activarlo/desactivarlo y ajustar el segundo valor despues desde los ajustes del grupo. La cantidad de usos disponibles se recalcula cada semana segun la diferencia de puntos con el lider (ver `WildcardsService.getComebackStatus`), no es un cupo fijo de temporada.

## Notificaciones push (Firebase Cloud Messaging)

Backend y frontend usan el mismo proyecto de Firebase pero con credenciales distintas:

- **Backend** (envia): variables `FIREBASE_*` de arriba (Admin SDK, secretas).
- **Frontend** (recibe): config *publica* del proyecto (protegida por las reglas de Firebase, no por ocultarla) en 3 sitios que deben coincidir:
  1. `frontend/src/environments/environment.ts` y `environment.prod.ts` — objeto `firebase` (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `vapidKey`).
  2. `frontend/public/firebase-messaging-sw.js` — mismo `apiKey`/`authDomain`/`projectId`/`storageBucket`/`messagingSenderId`/`appId` (este archivo se sirve tal cual, no pasa por el sistema de environments de Angular, asi que hay que editarlo a mano).

  Los valores salen de Firebase Console > Project settings > General > "Your apps" (crea una app Web si no existe) para todo menos `vapidKey`, que sale de Project settings > Cloud Messaging > Web Push certificates (genera un par de claves si no hay ninguna).

Sin esta config (`vapidKey` vacio), el boton "Activar" de notificaciones en Perfil se oculta y se muestra "No configuradas en este entorno" — no rompe nada, simplemente no hay push. El service worker de FCM se registra en un scope propio (`/firebase-cloud-messaging-push-scope`) para no chocar con el service worker de la PWA (`ngsw-worker.js`, que sigue controlando el resto de la app para cache offline).

## Jobs programados

El backend corre en segundo plano (`@nestjs/schedule`, ver `src/jobs/jobs.service.ts`):
- Sincroniza la jornada en curso de cada competicion usada por algun grupo (cada 12h).
- Envia los recordatorios de cierre (5h / 1h / 30min antes) a quien todavia no ha completado su quiniela (cada 5 min).
- Cierra jornadas cuyo plazo ha pasado (cada 1 min, no llama a la API) y sincroniza resultados (cada 10 min); al finalizar una jornada dispara puntuacion, clasificaciones, rachas, insignias y la notificacion de resultados publicados.

### Cupo de football-data.org (plan gratuito: 10 peticiones/minuto, sin limite diario)

Los partidos y resultados se guardan siempre en Postgres (`Matchday`/`Match`); el proveedor externo solo se consulta para *rellenar* esa cache, nunca se lee en caliente desde los endpoints que usa el frontend. Ademas:

- **Jornada en curso** (`MatchdaysService.syncCurrentRound`): si ya hay una jornada no finalizada guardada para la temporada, no se vuelve a pedir — solo se pide una jornada nueva cuando la anterior termina (o no hay ninguna todavia). En condiciones normales esto es 0 peticiones la mayoria de las veces que corre el cron.
- **Resultados** (`MatchdaysService.syncResultsForClosedMatchdays`): junta los partidos pendientes de *todas* las jornadas cerradas (de cualquier competicion) en una sola tanda de peticiones a `/matches?ids=...` (maximo 20 ids por peticion, se trocea si hace falta), en vez de una peticion por jornada. Tambien se salta partidos cuyo kickoff todavia no ha llegado.
- El limite de football-data.org es por minuto (no diario), asi que el patron de gasto real importa menos aqui que con un plan de cupo diario: con los crons actuales (jornada en curso cada 12h, resultados cada 10 min agrupando en una sola tanda), el numero de peticiones por minuto se queda en 1-2 salvo picos raros con muchas jornadas cerradas simultaneas. Si un grupo activa muchas competiciones con jornadas cerrandose a la vez, vigila los logs (`FootballDataOrgProvider` loguea cada peticion que hace) para confirmar que no te acercas al limite por minuto (cabecera `x-requests-available-minute` en las respuestas).
- Nota: football-data.org no cubre la UEFA Conference League en ningun plan (ver comentario en `prisma/seed.ts`); esa competicion queda con un `externalId` placeholder y su sincronizacion simplemente no devuelve partidos.

## Tests

```bash
npm run test:backend
```

Cubren la logica de calculo de puntos, el comodin de remontada (gap de puntos, allowance, activacion por grupo) y el cierre/finalizado de jornadas.
