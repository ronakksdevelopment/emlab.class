/*
 * service-worker.js - offline caching for EMlab Classes.
 * Caches the app shell so the interface loads offline. External CDN
 * resources (fonts, Font Awesome, QR libraries) are cached opportunistically
 * as they are fetched, with network falling back to cache when offline.
 */
const CACHE_NAME = 'emlab-classes-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './css/classroom.css',
  './css/responsive.css',
  './js/storage.js',
  './js/utils.js',
  './js/toast.js',
  './js/qr.js',
  './js/profile.js',
  './js/onboarding.js',
  './js/classes.js',
  './js/navigation.js',
  './js/classroom.js',
  './js/chat.js',
  './js/pwa.js',
  './js/app.js',
  './assets/logo/logo-original.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Network-first for navigation requests, so updates are picked up quickly
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(res => res || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else (app shell + CDN assets), with network fallback
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        // No cache and no network: fail gracefully for non-critical assets
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
