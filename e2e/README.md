# E2E (Playwright)

Tests end-to-end contra el frontend y backend de **desarrollo local** (no
contra `dev`/producción desplegados).

## Requisitos previos

Igual que para desarrollar a mano: backend + Postgres + frontend arrancados.

```bash
# 1. Postgres local (si no está ya arrancado)
docker start acerton-postgres-1

# 2. Backend (puerto 3000)
npm run dev:backend

# 3. Frontend (puerto 4200)
npm run dev:frontend
```

La cuenta usada por los tests es la sembrada por
`backend/scripts/seed-comeback-demo.ts` (`demo-tu@piqo.test` /
`Demo1234!`). Si la base de datos local no la tiene, ejecuta ese script una
vez:

```bash
npx ts-node backend/scripts/seed-comeback-demo.ts
```

## Ejecutar

```bash
npm run test:e2e        # headless, desde la raíz del repo
npx playwright test     # equivalente, desde e2e/
npx playwright test --headed   # viendo el navegador
npx playwright show-report     # último informe HTML
```

## Qué cubre

- **Autenticación**: login válido/inválido, alta de cuenta (hasta "revisa tu
  correo" — no se puede confirmar el email de verdad desde un test), cerrar
  sesión.
- **Grupos**: crear grupo en modo 1X2 y en modo resultado exacto (con el
  comodín de remontada activable en ambos — regresión de un bug real
  arreglado en esta misma sesión), activar/desactivar el comodín desde
  ajustes.
- **Jornada, modo 1X2**: elegir un pronóstico, que se guarde y persista.
- **Jornada, modo resultado exacto**: escribir un marcador y que persista;
  comodín de remontada (duplicar puntos) completo — activar, ver el badge
  "x2", que persista, prioridad frente al aviso normal, y quitarlo.
- **Perfil**: botones de cerrar sesión/tutorial a ancho completo (regresión).
- **Notificaciones**: pantalla de preferencias antes de activar el push, y
  la API de preferencias (incluida la de reenganche) a nivel de backend.

## Qué NO cubre (y por qué)

- Las preferencias de notificación **individuales** por UI: están detrás de
  un permiso de push realmente concedido y un registro contra Firebase, algo
  que no se puede simular de forma fiable en un test (red externa, service
  worker, VAPID key) — sí se cubre la API que las guarda.
- AdMob (banner y vídeo recompensado): no funciona fuera de la app nativa
  (`Capacitor.isNativePlatform()` es siempre `false` en un navegador de
  escritorio) — el comodín "extra por vídeo" se prueba concediéndolo
  directamente por API (mismo endpoint que llama la app tras ver el vídeo
  de verdad), no simulando el vídeo en sí.
- Flujos que dependen de otra cuenta (invitar a un grupo, comparar
  clasificación con otro usuario, comodín de remontada por ir realmente por
  detrás en la clasificación): necesitarían una segunda cuenta sembrada y
  datos de clasificación reales; quedan fuera del alcance de esta primera
  pasada.
