// 通用工具:日期、id、四舍五入
export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function nowISO() {
  return new Date().toISOString()
}

// 周一为一周起点
export function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const wd = (d.getDay() + 6) % 7 // 周一=0
  d.setDate(d.getDate() - wd)
  return todayStr(d)
}

export function daysBetween(fromStr, toStr) {
  const a = new Date(fromStr + 'T00:00:00')
  const b = new Date(toStr + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

export function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

export function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n))
}

export function fmtDateTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const same = d.toDateString() === now.toDateString()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return same ? `今天 ${hh}:${mi}` : `${mm}-${dd} ${hh}:${mi}`
}
