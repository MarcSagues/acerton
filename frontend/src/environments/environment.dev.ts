export const environment = {
  production: true,
  // Entorno dev/pre (app-dev.piqo.es): mismo formato que produccion, pero
  // apuntando al backend de dev, para no compartir sesion/cookies ni datos
  // con produccion (ver comentario en environment.prod.ts sobre por que
  // hace falta la URL completa).
  apiUrl: 'https://api-dev.piqo.es/api',
  appUrl: 'https://app-dev.piqo.es',
  googleWebClientId: '274153738044-0lnso05j0rpi3pvegl20r5rh8obias9n.apps.googleusercontent.com',
  admob: {
    android: {
      appId: 'ca-app-pub-6403313027738561~6956033343',
      bannerAdUnitId: 'ca-app-pub-6403313027738561/9390624995',
      rewardedAdUnitId: 'ca-app-pub-6403313027738561/2423918080',
    },
    ios: {
      appId: 'ca-app-pub-6403313027738561~1184831918',
      bannerAdUnitId: 'ca-app-pub-6403313027738561/1242698356',
      rewardedAdUnitId: 'ca-app-pub-6403313027738561/1954988105',
    },
  },
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
