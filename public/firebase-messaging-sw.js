// Firebase Cloud Messaging Service Worker
// Handle push notifications saat app di background

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js')

// Ganti dengan konfigurasi Firebase Anda (sama seperti di src/firebase.js)
firebase.initializeApp({
  apiKey: 'GANTI_DENGAN_API_KEY',
  authDomain: 'GANTI_DENGAN_AUTH_DOMAIN',
  projectId: 'GANTI_DENGAN_PROJECT_ID',
  storageBucket: 'GANTI_DENGAN_STORAGE_BUCKET',
  messagingSenderId: 'GANTI_DENGAN_SENDER_ID',
  appId: 'GANTI_DENGAN_APP_ID'
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}
  self.registration.showNotification(title || 'Cerdas Uang', {
    body: body || 'Ada update baru untuk keuangan kamu',
    icon: icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: payload.data || {}
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
