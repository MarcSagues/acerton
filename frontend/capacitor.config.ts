import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.piqo.es',
  appName: 'Piqo',
  webDir: 'dist/frontend/browser',
  // El refresh token se guarda en una cookie SameSite=Lax (ver
  // auth.controller.ts) que solo viaja porque app.piqo.es y api.piqo.es
  // son el mismo sitio registrable (piqo.es). Sin esto el WebView serviria
  // la app desde https://localhost, un origen distinto para el que esa
  // cookie nunca se enviaria — se le dice a Capacitor que sirva los assets
  // locales "como si" fueran app.piqo.es para que el navegador los trate
  // igual que en la web real.
  server: {
    hostname: 'app.piqo.es',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    // Con 'banner'/'list' el sistema muestra su banner deslizante normal
    // (como cualquier otra app, WhatsApp incluido) tambien con la app en
    // primer plano — a peticion expresa del usuario, que no queria la
    // alerta centrada de antes (ver PushNotificationsService, que ya no
    // la muestra para no duplicar el aviso).
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
    // Por defecto (resize: 'native') iOS encoge el WKWebView entero al
    // abrir el teclado, lo que arrastra hacia arriba cualquier elemento
    // position:fixed (la barra inferior "sube" pegada al teclado en vez
    // de quedarse fija en el borde real de la pantalla). Con 'none' el
    // WebView no se redimensiona a si mismo: el teclado se superpone por
    // encima sin mover nada fijo.
    Keyboard: {
      resize: 'none',
    },
    // El fetch/XHR normal del WKWebView esta fallando en iOS con "Load
    // failed" para cualquier peticion, incluso al propio origen local. Esto
    // hace que fetch/XHR pasen por codigo nativo (URLSession) en vez de por
    // el motor de red del WebView, que es el que esta fallando.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
