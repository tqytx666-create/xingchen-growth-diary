import { pet, streak, audit, child } from '../lib/store.js'
import { SKIN_TRACK } from '../lib/petImages.js'
import { SKIN_IDLE } from '../lib/petAnims.js'
import { nowISO } from '../lib/util.js'

// 解锁进度用"累计英语签到天数"
export function skinDays() { return streak().total_main_checkin_days || 0 }

export function isSkinUnlocked(days) { return skinDays() >= days }

// 跑道状态:每个皮肤 + 是否解锁 + 是否当前装扮
export function skinTrackState() {
  const cur = pet().skin || 'default'
  return SKIN_TRACK.map(s => ({ ...s, unlocked: isSkinUnlocked(s.days), equipped: cur === s.key, animated: !!SKIN_IDLE[s.key] }))
}

// 下一个待解锁皮肤(还差几天)
export function nextSkin() {
  const d = skinDays()
  const s = SKIN_TRACK.find(x => x.days > d)
  return s ? { ...s, remain: s.days - d } : null
}

// 装扮 / 脱下(传 'default' 脱下)
export function equipSkin(key) {
  const p = pet()
  if (key !== 'default') {
    const s = SKIN_TRACK.find(x => x.key === key)
    if (s && !isSkinUnlocked(s.days)) return false
  }
  p.skin = key
  audit(child().id, 'skin', key, 'equip', { skin: key })
  p.updated_at = nowISO()
  return true
}
