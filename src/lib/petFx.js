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
