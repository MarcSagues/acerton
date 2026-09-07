export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
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
