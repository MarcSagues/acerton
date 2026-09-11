// Service worker dedicado a Firebase Cloud Messaging. Se registra en un scope
// separado ('/firebase-cloud-messaging-push-scope') para no pisar el service
// worker de Angular (ngsw-worker.js, que controla '/'). No necesita controlar
// ninguna pagina: solo recibe eventos push y muestra la notificacion cuando
// la app esta en segundo plano o cerrada.
//
// IMPORTANTE: este archivo se sirve tal cual (no pasa por el sistema de
// environments de Angular), asi que la config de Firebase esta duplicada
// aqui. Debe coincidir con src/environments/environment*.ts.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCbYMyNUeENK5PfohH_NX1CuxvKgG6k11Y',
  authDomain: 'acerton-39f07.firebaseapp.com',
  projectId: 'acerton-39f07',
  storageBucket: 'acerton-39f07.firebasestorage.app',
  messagingSenderId: '486195504172',
  appId: '1:486195504172:web:fa3a65a897d00463d35d89',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Piqo';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
