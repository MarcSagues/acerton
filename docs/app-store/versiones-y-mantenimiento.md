# Versiones, actualización obligatoria y mantenimiento

Desde la 1.1.2 la app (nativa y web) manda en cada petición `X-App-Platform`
(`ios`/`android`/`web`) y `X-App-Version`. Una petición **sin** esas cabeceras
solo puede venir de la app nativa 1.1.0/1.1.1. Código: `backend/src/app-client/`
y `frontend/src/app/core/app-client/`.

## Cómo publicar una versión sin romper la de los usuarios

1. **Backend primero.** Cada cambio es compatible con la versión publicada:
   - Campos y endpoints nuevos se añaden, nunca se cambian ni se quitan los que
     usa una versión en la calle.
   - Lo que la versión anterior no entiende va detrás de una versión:
     `APP_FEATURES.miCosa = '1.1.3'` y en el controlador
     `appSupports(client, APP_FEATURES.miCosa)` (con `@AppClient() client`).
     La web siempre lo recibe; la app antigua, no.
   - Base de datos en dos fases: primero solo añadir (columnas opcionales o con
     valor por defecto, tablas nuevas); renombrar = columna nueva + copiar + escribir
     en las dos; borrar lo viejo solo cuando la versión mínima ya no lo use.
2. Desplegar el backend. Nadie nota nada.
3. Subir el build a revisión con **"Publicar manualmente"** en App Store Connect.
   El revisor lo prueba contra producción y ve lo nuevo.
4. Aprobado → publicar.
5. **Solo cuando ya está en las dos tiendas** (y terminada la publicación por
   fases de iOS, si se usa), subir la versión mínima si hace falta.

## Actualización obligatoria

Variables de entorno de la API (Render):

| Variable | Qué hace |
| --- | --- |
| `MIN_APP_VERSION_IOS` | Por debajo, la app iOS solo deja ir a la tienda. Vacía = sin mínimo. |
| `MIN_APP_VERSION_ANDROID` | Lo mismo en Android. |
| `APP_STORE_URL_IOS` / `APP_STORE_URL_ANDROID` | Opcional; por defecto, la ficha de Piqo. |

La app lo mira al arrancar y al volver a primer plano (`GET /api/app-config`).
Si no hay respuesta, deja entrar. La 1.1.0/1.1.1 no tienen esta pantalla.

## Modo mantenimiento

Para algo crítico de horas, no de días. La API contesta 503 y la app enseña
"Estamos en mantenimiento" con un botón de reintentar.

| Variable | Qué hace |
| --- | --- |
| `MAINTENANCE_MODE` | `true` para activarlo. |
| `MAINTENANCE_PLATFORMS` | A quién afecta: `ios,android,web` por defecto. Con `ios,android` la web sigue abierta. |
| `MAINTENANCE_ALLOW_MIN_VERSION` | La app con esta versión o superior pasa (la que está en revisión). |
| `MAINTENANCE_ALLOW_EMAILS` | Correos que pasan siempre, separados por comas (la cuenta demo de Apple/Google). |

- Siguen abiertos el login (`/auth/*`), `/app-config` y `/dashboard/*`; las
  tareas programadas siguen corriendo.
- Cambiar una variable en Render reinicia el servicio: tarda un par de minutos.
- La 1.1.0/1.1.1 no entienden el 503: verán errores en vez de la pantalla.
- No sirve para "subir una migración que rompe la versión de los usuarios y
  esperar a que Apple revise": la revisión puede tardar días.
