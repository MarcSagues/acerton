export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  // URL publica de la propia app (no la API): en un WebView nativo
  // (Capacitor) window.location.origin es "capacitor://localhost", que no
  // sirve de nada si se comparte fuera de la app (p.ej. el enlace de
  // invitacion a un grupo) — hay que usar siempre esta URL real en su lugar.
  appUrl: 'http://localhost:4200',
  // Mismo client id "web" que el backend (GOOGLE_CLIENT_ID en .env) — el
  // plugin nativo de Google Sign-In lo exige en todas las plataformas para
  // que el idToken resultante se pueda verificar en un backend compartido.
  googleWebClientId: '274153738044-0lnso05j0rpi3pvegl20r5rh8obias9n.apps.googleusercontent.com',
  // AdMob (apps nativas; la web sigue usando AdSense). En desarrollo se usan
  // los ad unit ids de prueba oficiales de Google en vez de los reales, para
  // no generar impresiones/clics automatizados contra la cuenta real durante
  // las pruebas — ver AdsService.
  admob: {
    android: { appId: 'ca-app-pub-3940256099942544~3347511713', bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111' },
    ios: { appId: 'ca-app-pub-3940256099942544~1458002511', bannerAdUnitId: 'ca-app-pub-3940256099942544/2934735716' },
  },
  // Config publica del proyecto Firebase (no son secretos: se protegen con
  // las reglas de seguridad de Firebase, no ocultandolas). Rellena con los
  // valores de Project settings > General > "Your apps" (Web) y
  // Project settings > Cloud Messaging > Web Push certificates (vapidKey).
  // Debe coincidir con public/firebase-messaging-sw.js (ese archivo estatico
  // no pasa por el sistema de environments de Angular).
  firebase: {
    apiKey: 'AIzaSyCbYMyNUeENK5PfohH_NX1CuxvKgG6k11Y',
    authDomain: 'acerton-39f07.firebaseapp.com',
    projectId: 'acerton-39f07',
    storageBucket: 'acerton-39f07.firebasestorage.app',
    messagingSenderId: '486195504172',
    appId: '1:486195504172:web:fa3a65a897d00463d35d89',
    vapidKey: 'BCpFI6szjiaiaXyJDWhc-ivoZ9HV0XpfdIRldjJ8-u3IckjDsxFhBu-oP-lJiBpLPxpwigEJGdjnvnsax9XZo08',
  },
};
