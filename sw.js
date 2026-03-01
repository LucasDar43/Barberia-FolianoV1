const CACHE_NAME = 'barberia-foliano-v2';

const ARCHIVOS_A_CACHEAR = [
    '/',
    '/index.html',
    '/app.html',
    '/js/app.js',
    '/js/extensiones.js',
    '/css/styles.css',
    '/css/login.css',
    '/css/nuevas-secciones.css',
    '/assets/logo.png',
    '/manifest.json'
];

// Instalar: guardar archivos en cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ARCHIVOS_A_CACHEAR);
        })
    );
    self.skipWaiting();
});

// Activar: limpiar caches viejas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    clients.claim();
});

// Fetch: Network first, cache como fallback
self.addEventListener('fetch', (event) => {
    // No interceptar requests de Firebase
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('identitytoolkit.googleapis.com') ||
        event.request.url.includes('securetoken.googleapis.com') ||
        event.request.url.includes('firebasejs')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
