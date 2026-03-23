const CACHE_NAME = 'typetc-v1.1.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './favicon.png',
    './og-image.png',
    './manifest.json',
    './pwa-icon-192.png',
    './pwa-icon-512.png'
];

// 安裝階段：預快取核心資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 激活階段：清理舊快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', (event) => {
    // 排除 Firebase API 與 Vite 開發工具請求
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('google-analytics.com') ||
        event.request.url.includes('/@vite/') ||
        event.request.url.includes('node_modules')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // 命中快取則直接返回，否則從網路獲取
            return response || fetch(event.request).then((fetchResponse) => {
                // 如果是靜態資源且請求成功，動態加入快取
                if (fetchResponse.status === 200 && event.request.method === 'GET') {
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return fetchResponse;
            });
        }).catch(() => {
            // 離線且無快取時，若是導向 index.html
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
