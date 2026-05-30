// 极简 service worker:缓存壳资源,离线可打开。网络优先、回退缓存。
const CACHE = 'xc-cache-v1'
self.addEventListener('install', e => { self.skipWaiting() })
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  // 只处理同源
  if (new URL(req.url).origin !== location.origin) return
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone()
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {})
      return res
    }).catch(() => caches.match(req))
  )
})
