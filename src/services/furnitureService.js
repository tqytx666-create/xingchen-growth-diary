import { db, pet, streak, audit, child } from '../lib/store.js'
import { FURNITURE } from '../lib/petImages.js'
import { nowISO } from '../lib/util.js'

export function furnDays() { return streak().total_main_checkin_days || 0 }
export function isUnlocked(f) { return furnDays() >= f.days }
// 是否摆出:有显式设置用设置,否则默认"解锁即摆出"
export function isPlaced(f) {
  const m = db.furniture || {}
  return (f.key in m) ? !!m[f.key] : isUnlocked(f)
}

// 房间里要显示的家具(已解锁且摆出)
export function placedFurniture() {
  return FURNITURE.filter(f => isUnlocked(f) && isPlaced(f))
}

// 装饰面板用:全部家具 + 解锁/摆放状态
export function furnitureState() {
  return FURNITURE.map(f => ({ ...f, unlocked: isUnlocked(f), placed: isPlaced(f) }))
}

// 切换摆放(未解锁不可)
export function togglePlace(key) {
  const f = FURNITURE.find(x => x.key === key)
  if (!f || !isUnlocked(f)) return false
  if (!db.furniture) db.furniture = {}
  db.furniture[key] = !isPlaced(f)
  pet().updated_at = nowISO()
  audit(child().id, 'furniture', key, db.furniture[key] ? 'place' : 'remove', {})
  return true
}
