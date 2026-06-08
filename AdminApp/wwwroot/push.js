// 클라이언트 측 푸시 구독 등록 로직.
// adminPush.subscribe() 호출 시: 권한 요청 → SW 등록 → 푸시 구독 → 서버에 전송

(function () {
    function urlBase64ToUint8Array(base64) {
        const padding = '='.repeat((4 - base64.length % 4) % 4);
        const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(b64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        return arr;
    }
    function arrayBufferToBase64Url(buffer) {
        const bytes = new Uint8Array(buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    async function isSupported() {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    }

    async function getCurrentStatus() {
        if (!(await isSupported())) return { supported: false, permission: 'unsupported', subscribed: false };
        const reg = await navigator.serviceWorker.getRegistration();
        let subscribed = false;
        if (reg) {
            const sub = await reg.pushManager.getSubscription();
            subscribed = !!sub;
        }
        return { supported: true, permission: Notification.permission, subscribed };
    }

    async function subscribe() {
        if (!(await isSupported())) {
            alert('이 브라우저는 푸시 알림을 지원하지 않아요.\n(iOS는 "홈 화면에 추가" 후 16.4+ 에서 가능)');
            return { ok: false, reason: 'unsupported' };
        }

        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
            return { ok: false, reason: 'denied' };
        }

        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // VAPID 공개키 받아오기
        const res = await fetch('/api/push/vapid-public-key');
        if (!res.ok) return { ok: false, reason: 'no-vapid' };
        const { publicKey } = await res.json();

        // 이미 구독 중이면 그대로 사용
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
        }

        const p256dh = arrayBufferToBase64Url(sub.getKey('p256dh'));
        const auth = arrayBufferToBase64Url(sub.getKey('auth'));

        const save = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                endpoint: sub.endpoint,
                p256dh,
                auth,
                userAgent: navigator.userAgent
            })
        });
        if (!save.ok) return { ok: false, reason: 'save-failed' };
        return { ok: true };
    }

    async function unsubscribe() {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return { ok: true };
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            await fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ endpoint: sub.endpoint })
            });
            await sub.unsubscribe();
        }
        return { ok: true };
    }

    window.adminPush = { isSupported, getCurrentStatus, subscribe, unsubscribe };
})();
