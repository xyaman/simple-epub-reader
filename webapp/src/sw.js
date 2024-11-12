const CACHE_NAME = "epub-reader";

// A change of one character should trigger the update 
const version = "0.0.1-v2"

const urlsToCache = [
  "/",
  "/sw.js",
  "/style.css",
  "/index.html",
  "/reader.html",
  "/settings.html",
  "/js/collection.js",
  "/js/reader.js",
  "/js/settings.js",
];

// Instalar el service worker y cachear los recursos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activar el service worker y eliminar cachés antiguas si es necesario
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  const requestURL = new URL(event.request.url);

  // reader.html always has a param id
  // ..../reader.html?id=1
  // ..../reader.html?id=3

  if (requestURL.pathname === '/reader.html') {
    event.respondWith(
      caches.match('/reader.html').then((response) => {
        return response || fetch(event.request);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
