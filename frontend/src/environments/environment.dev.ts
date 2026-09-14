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
      appId: 'ca-app-pub-1185144357301303~6197649742',
      bannerAdUnitId: 'ca-app-pub-1185144357301303/4884568079',
      rewardedAdUnitId: 'ca-app-pub-1185144357301303/1194596895',
    },
    ios: {
      appId: 'ca-app-pub-1185144357301303~8853049890',
      bannerAdUnitId: 'ca-app-pub-1185144357301303/1167694667',
      rewardedAdUnitId: 'ca-app-pub-1185144357301303/1470316108',
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
