import { db, audit, child } from '../lib/store.js'
import { ITEMS, itemDef } from '../lib/items.js'
import * as petSvc from './petService.js'

function bag() { if (!db.items) db.items = {}; return db.items }

// 各道具持有数量(对齐 ITEMS 顺序)
export function ownedItems() {
  const b = db.items || {}
  return ITEMS.map(i => ({ ...i, count: b[i.key] || 0 }))
}
export function totalItems() {
  const b = db.items || {}
  return ITEMS.reduce((s, i) => s + (b[i.key] || 0), 0)
}

// 使用一个道具:扣库存 → 应用效果。返回 { item, lv } 或 null(没有该道具)
export function useItem(key) {
  const item = itemDef(key)
  const b = bag()
  if (!item || (b[key] || 0) < 1) return null
  b[key] = b[key] - 1
  const lv = petSvc.applyItem(item)
  audit(child().id, 'item', key, 'use', { item: item.name })
  return { item, lv }
}

// 给一个道具(数量默认1)
export function giveItem(key, n = 1) {
  const b = bag()
  b[key] = (b[key] || 0) + n
}
// 随机给一个道具(宝箱掉落用),魔法棒更稀有
export function giveRandomItem() {
  const pool = ['bone', 'bone', 'fish', 'fish', 'ball', 'ball', 'wand']
  const key = pool[Math.floor(Math.random() * pool.length)]
  giveItem(key, 1)
  return itemDef(key)
}
