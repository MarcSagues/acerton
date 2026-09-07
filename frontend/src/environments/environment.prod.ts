export const environment = {
  production: true,
  // Frontend (Cloudflare Pages) y backend (Render) van en subdominios distintos
  // del mismo dominio, no en el mismo origen, asi que hace falta la URL completa.
  apiUrl: 'https://api.acerton.app/api',
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
