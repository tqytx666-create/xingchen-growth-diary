// 任务动画:在传入的 fx 容器里生成粒子
function spawn(fx, emoji, left, bottom, cls, life, vars) {
  if (!fx) return
  const f = document.createElement('div')
  f.className = cls; f.textContent = emoji
  f.style.left = left + 'px'; f.style.bottom = bottom + 'px'
  if (vars) for (const k in vars) f.style.setProperty(k, vars[k])
  fx.appendChild(f); setTimeout(() => f.remove(), life)
  return f
}

// 让狗本体做出对应动作(临时加 act-* 类)
function actOn(dogEl, cls, dur) {
  if (!dogEl) return
  dogEl.classList.add(cls)
  setTimeout(() => dogEl.classList.remove(cls), dur)
}

export function playTaskAnim(fx, kind, dogEl) {
  if (kind === 'study') {
    actOn(dogEl, 'act-study', 1500)   // 低头读书
    const b = spawn(fx, '📖', 90, 40, 'floaty float-go', 1500); if (b) b.style.opacity = 1
    for (let i = 0; i < 5; i++) setTimeout(() => spawn(fx, '⭐', 90 + Math.random() * 20, 60, 'floaty into-go', 1300, { '--sx': (Math.random() * 120 - 60) + 'px' }), i * 180)
  } else if (kind === 'brush') {
    actOn(dogEl, 'act-brush', 1500)   // 摇头刷牙
    const b = spawn(fx, '🪥', 70, 70, 'floaty float-go', 1500); if (b) b.style.opacity = 1
    for (let i = 0; i < 4; i++) setTimeout(() => spawn(fx, '✨', 95 + Math.random() * 30, 80, 'floaty float-go', 1500), i * 200)
  } else if (kind === 'bath') {
    actOn(dogEl, 'act-bath', 1700)    // 抖身甩水
    for (let i = 0; i < 10; i++) setTimeout(() => spawn(fx, ['🫧', '💧', '🫧'][i % 3], 50 + Math.random() * 100, 90, 'floaty bubble-go', 1900), i * 130)
    if (dogEl) setTimeout(() => { dogEl.classList.add('flash'); setTimeout(() => dogEl.classList.remove('flash'), 900) }, 900)
  } else if (kind === 'badminton') {
    actOn(dogEl, 'act-badminton', 1500) // 跳跃接球
    for (let i = 0; i < 3; i++) setTimeout(() => spawn(fx, '🏸', 40, 90, 'floaty fly-go', 1200), i * 350)
  }
}
export function spawnFloaty(fx, emoji) {
  spawn(fx, emoji, 60 + Math.random() * 80, 120, 'floaty float-go', 1500)
}

// 摸头:一簇 emoji 向上飘散
export function spawnBurst(fx, emojis, n = 6) {
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const e = emojis[Math.floor(Math.random() * emojis.length)]
      const left = 50 + Math.random() * 100
      const f = spawn(fx, e, left, 110 + Math.random() * 30, 'floaty float-go', 1500)
      if (f) f.style.fontSize = (16 + Math.random() * 12) + 'px'
    }, i * 70)
  }
}

// 魔法棒式收集:一群发光小星星从起点喷出 → 拖尾绕一圈 → 俯冲汇入目标元素。onArrive 在汇入时回调
export function magicCollect(fromEl, toEl, onArrive) {
  if (!fromEl || !toEl) { onArrive && onArrive(); return }
  const b = fromEl.getBoundingClientRect(), t = toEl.getBoundingClientRect()
  const sx = b.left + b.width / 2, sy = b.top + b.height / 2
  const tx = t.left + t.width / 2, ty = t.top + t.height / 2
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4
  const layer = document.createElement('div')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:90'
  const ICON = ['⭐', '✨', '🌟', '💫', '⏱️']
  const N = 26
  for (let i = 0; i < N; i++) {
    const s = document.createElement('div')
    s.textContent = ICON[i % ICON.length]
    s.style.cssText = 'position:fixed;left:' + sx + 'px;top:' + sy + 'px;font-size:' + (12 + Math.random() * 14) + 'px;transform:translate(-50%,-50%);opacity:0;will-change:transform,opacity;filter:drop-shadow(0 0 6px rgba(255,216,107,.95)) drop-shadow(0 0 12px rgba(255,201,64,.6))'
    layer.appendChild(s)
    // 多圈环绕:绕中心点逐步推进角度,转好几圈再慢慢汇入余额(慢一点、看得清)
    const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5
    const R = 120 + Math.random() * 95
    const orbit = (da, scaleR) => { const a = ang + da, r = R * scaleR; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] }
    const [m1x, m1y] = orbit(0, 1)
    const [m2x, m2y] = orbit(2.1, 0.92)
    const [m3x, m3y] = orbit(4.2, 0.78)
    const [m4x, m4y] = orbit(6.3, 0.64)   // 又绕了一圈多
    const [m5x, m5y] = orbit(8.4, 0.5)
    const T = (dx, dy, sc, rot) => 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotate(' + rot + 'deg)'
    s.animate([
      { transform: T(0, 0, 0.4, 0), opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.08 },
      { transform: T(m1x - sx, m1y - sy, 1.3, 180), opacity: 1, offset: 0.22 },
      { transform: T(m2x - sx, m2y - sy, 1.2, 360), opacity: 1, offset: 0.4 },
      { transform: T(m3x - sx, m3y - sy, 1.1, 560), opacity: 1, offset: 0.58 },
      { transform: T(m4x - sx, m4y - sy, 1.0, 760), opacity: 1, offset: 0.74 },
      { transform: T(m5x - sx, m5y - sy, 0.85, 960), opacity: 1, offset: 0.88 },
      { transform: T(tx - sx, ty - sy, 0.2, 1180), opacity: 0, offset: 1 }
    ], { duration: 2600 + Math.random() * 400, delay: i * 26, easing: 'cubic-bezier(.42,0,.3,1)', fill: 'forwards' })
  }
  document.body.appendChild(layer)
  setTimeout(() => onArrive && onArrive(), 2500)   // 星星快汇入余额时再入账 + 数字上跳
  setTimeout(() => layer.remove(), 3600)
}
