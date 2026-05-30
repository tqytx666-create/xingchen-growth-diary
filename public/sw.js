// Service worker v3:HTML/JS/CSS 始终网络优先(保证更新及时),仅图片等静态资源用缓存兜底。
// 每次发版只要改 CACHE 版本号,激活时自动清掉所有旧缓存。
const CACHE = 'xc-cache-v3'

self.addEventListener('install', () => { self.skipWaiting() })

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) // 清掉全部旧缓存
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  if (new URL(req.url).origin !== location.origin) return

  const dest = req.destination
  // 代码与页面:网络优先,失败才回退缓存(避免旧版本被钉死)
  if (dest === 'document' || dest === 'script' || dest === 'style' || req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {})
        return res
      }).catch(() => caches.match(req))
    )
    return
  }
  // 图片等:缓存优先,提速 + 离线可用
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone()
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {})
      return res
    }))
  )
})
