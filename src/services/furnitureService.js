import { db, pet, audit, child } from '../lib/store.js'
import { FURNITURE } from '../lib/petImages.js'
import { nowISO } from '../lib/util.js'

// 拥有的家具(商城购买);未拥有不能摆
export function ownedFurniture() { return db.owned_furniture || [] }
export function isOwned(f) { return ownedFurniture().includes(f.key) }
// 是否摆出:有显式设置用设置,否则默认"拥有即摆出"
export function isPlaced(f) {
  if (!isOwned(f)) return false
  const m = db.furniture || {}
  return (f.key in m) ? !!m[f.key] : true
}

// 房间里要显示的家具(已拥有且摆出)
export function placedFurniture() {
  return FURNITURE.filter(f => isOwned(f) && isPlaced(f))
}

// 装饰面板用:全部家具 + 拥有/摆放状态
export function furnitureState() {
  return FURNITURE.map(f => ({ ...f, owned: isOwned(f), placed: isPlaced(f) }))
}

// 切换摆放(未拥有不可)
export function togglePlace(key) {
  const f = FURNITURE.find(x => x.key === key)
  if (!f || !isOwned(f)) return false
  if (!db.furniture) db.furniture = {}
  db.furniture[key] = !isPlaced(f)
  pet().updated_at = nowISO()
  audit(child().id, 'furniture', key, db.furniture[key] ? 'place' : 'remove', {})
  return true
}
