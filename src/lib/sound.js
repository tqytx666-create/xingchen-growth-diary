// 用 Web Audio 合成轻量音效,无需音频素材。可全局开关。
let ctx = null
let enabled = true
try { enabled = localStorage.getItem('xc_sound') !== 'off' } catch (e) {}

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) { ctx = null }
  }
  return ctx
}

export function soundEnabled() { return enabled }
export function toggleSound() {
  enabled = !enabled
  try { localStorage.setItem('xc_sound', enabled ? 'on' : 'off') } catch (e) {}
  if (enabled) tone(660, 0.08, 'sine', 0.15)
  return enabled
}

// 单音:freq(Hz) dur(秒) type 波形 vol 音量
function tone(freq, dur, type = 'sine', vol = 0.2, when = 0) {
  const c = ac(); if (!c || !enabled) return
  if (c.state === 'suspended') c.resume()
  const t = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g); g.connect(c.destination)
  osc.start(t); osc.stop(t + dur + 0.02)
}

// 一串音符上行 = 愉悦反馈
function arp(freqs, step = 0.09, type = 'triangle', vol = 0.2, dur = 0.16) {
  freqs.forEach((f, i) => tone(f, dur, type, vol, i * step))
}

export const sfx = {
  // 打卡:轻快两声
  checkin() { arp([523, 784], 0.07, 'triangle', 0.16, 0.14) },
  // 互动长属性:叮一下
  pop() { tone(880, 0.12, 'sine', 0.18) },
  // 升级:上行三音
  levelup() { arp([523, 659, 880], 0.1, 'triangle', 0.22, 0.2) },
  // 进化:更长的上行琶音 + 高音收尾
  evolve() { arp([523, 659, 784, 1047, 1319], 0.11, 'triangle', 0.22, 0.24); tone(1568, 0.5, 'sine', 0.15, 0.62) },
  // 摸头:萌一声
  pet() { tone(740, 0.1, 'sine', 0.14); tone(988, 0.1, 'sine', 0.1, 0.06) },
  // 错误/提示:低钝一声
  err() { tone(220, 0.18, 'sawtooth', 0.12) }
}
