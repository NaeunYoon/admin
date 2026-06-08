// AdminApp Service Worker — 푸시 알림 수신 + 클릭 시 페이지 이동
// (캐싱은 하지 않음 — 항상 네트워크에서 최신 가져오기)

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 푸시 메시지 수신 → 시스템 알림 표시
self.addEventListener('push', (event) => {
    let data = { title: '사내 어드민', body: '새 알림이 있습니다.', url: '/' };
    try {
        if (event.data) data = { ...data, ...event.data.json() };
    } catch (e) { /* 파싱 실패 시 기본값 사용 */ }

    const options = {
        body: data.body,
        icon: data.icon || '/favicon.png',
        badge: data.badge || '/favicon.png',
        data: { url: data.url || '/' },
        tag: data.tag || 'admin-app',
        renotify: true,
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 알림 클릭 → 해당 URL 열기 / 포커스
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil((async () => {
        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
            // 이미 열려있는 탭이 있으면 포커스 + 해당 URL로 이동
            if ('focus' in client) {
                try { await client.navigate(targetUrl); } catch (_) {}
                return client.focus();
            }
        }
        if (clients.openWindow) {
            return clients.openWindow(targetUrl);
        }
    })());
});
