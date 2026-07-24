// Service worker de PadelwIArk. Su función HOY: hacer la app INSTALABLE (PWA) y, más adelante (E4.2),
// recibir las notificaciones push. NO cachea NADA de la API: es una app de reservas y plata en tiempo
// real → servir data vieja sería inaceptable (mismo espíritu que la regla de medianoche: cero fantasmas).
// Por eso no hay estrategia de caché: cada request va SIEMPRE a la red (el navegador la maneja por defecto).

self.addEventListener('install', () => {
  self.skipWaiting() // el SW nuevo toma control sin esperar a que se cierren las pestañas viejas
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Fetch pass-through: no interceptamos nada (sin caché). Presente para cumplir installability
// en navegadores que lo piden. La data siempre llega fresca del servidor.
self.addEventListener('fetch', () => { /* passthrough: sin respondWith → el navegador hace la request normal */ })

// --- Push (E4.2) se agrega acá más adelante: eventos 'push' y 'notificationclick' ---
