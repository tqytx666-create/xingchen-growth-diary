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
    const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5
    const R = 120 + Math.random() * 95
    const mx = cx + Math.cos(ang) * R, my = cy + Math.sin(ang) * R
    const a2 = ang + 1.5, R2 = R * 0.66
    const wx = cx + Math.cos(a2) * R2, wy = cy + Math.sin(a2) * R2
    s.animate([
      { transform: 'translate(-50%,-50%) translate(0px,0px) scale(.4) rotate(0deg)', opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.12 },
      { transform: 'translate(-50%,-50%) translate(' + (mx - sx) + 'px,' + (my - sy) + 'px) scale(1.3) rotate(170deg)', opacity: 1, offset: 0.4 },
      { transform: 'translate(-50%,-50%) translate(' + (wx - sx) + 'px,' + (wy - sy) + 'px) scale(1) rotate(310deg)', opacity: 1, offset: 0.66 },
      { transform: 'translate(-50%,-50%) translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px) scale(.22) rotate(540deg)', opacity: 0, offset: 1 }
    ], { duration: 1300 + Math.random() * 250, delay: i * 22, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' })
  }
  document.body.appendChild(layer)
  setTimeout(() => onArrive && onArrive(), 1080)
  setTimeout(() => layer.remove(), 1800)
}
