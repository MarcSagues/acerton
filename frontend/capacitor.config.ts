import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.acerton.quiniela',
  appName: 'Quiniela',
  webDir: 'dist/frontend/browser',
  // El refresh token se guarda en una cookie SameSite=Lax (ver
  // auth.controller.ts) que solo viaja porque acerton.app y api.acerton.app
  // son el mismo sitio registrable. Sin esto el WebView serviria la app
  // desde https://localhost, un origen distinto para el que esa cookie
  // nunca se enviaria — se le dice a Capacitor que sirva los assets locales
  // "como si" fueran acerton.app para que el navegador los trate igual que
  // en la web real.
  server: {
    hostname: 'acerton.app',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
};

export default config;
