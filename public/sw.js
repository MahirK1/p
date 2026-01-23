// Service Worker za Push Notifikacije
const CACHE_NAME = 'italgroup-portal-v1';

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Push Notification
self.addEventListener('push', (event) => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { 
        title: 'Nova poruka', 
        body: event.data.text() || 'Imate novu poruku' 
      };
    }
  }

  const title = data.title || 'Italgroup Portal';
  const options = {
    body: data.body || 'Imate novu notifikaciju',
    icon: data.icon || '/italgroup-logo.png',
    badge: '/italgroup-logo.png',
    tag: data.tag || 'default',
    requireInteraction: false,
    data: data.data || {},
    vibrate: [200, 100, 200],
    // iOS podrška
    silent: false,
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Otvori chat'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  event.notification.close();

  const data = event.notification.data || {};
  let urlToOpen = data.url || '/dashboard/commercial';
  
  // Ako je notifikacija za posjetu, idi direktno na posjete
  if (data.type === 'visit') {
    urlToOpen = '/dashboard/commercial/visits';
  } else if (data.roomId) {
    // Ako je notifikacija za chat, idi na chat sa room ID
    urlToOpen = `/dashboard/commercial/chat?room=${data.roomId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Pokušaj pronaći postojeći prozor
      for (let client of clientList) {
        if ('focus' in client) {
          // Navigiraj na odgovarajuću stranicu
          if (client.url && !client.url.includes(urlToOpen)) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Otvori novi prozor
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
