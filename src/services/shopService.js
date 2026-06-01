import { db, audit, child } from '../lib/store.js'
import { SKIN_TRACK, ROOM_TRACK, FURNITURE } from '../lib/petImages.js'
import { ITEMS } from '../lib/items.js'
import { SKIN_PRICE, ROOM_PRICE, FURN_PRICE, ITEM_PRICE } from '../lib/shop.js'
import * as coinSvc from './coinService.js'
import { isSkinOwned } from './skinService.js'
import { isRoomOwned } from './roomService.js'
import { ownedFurniture } from './furnitureService.js'

function priceOf(type, key) {
  return ({ skin: SKIN_PRICE, room: ROOM_PRICE, furniture: FURN_PRICE, item: ITEM_PRICE }[type] || {})[key]
}
function ownedNow(type, key) {
  if (type === 'skin') return isSkinOwned(key)
  if (type === 'room') return isRoomOwned(key)
  if (type === 'furniture') return ownedFurniture().includes(key)
  return false   // 道具是消耗品,可重复买
}

// 商城目录:各分类商品 + 价格 + 是否已拥有
export function shopCatalog() {
  return [
    { type: 'skin', title: '👕 皮肤装扮', items: SKIN_TRACK.map(s => ({ key: s.key, name: s.name, emoji: s.emoji, img: s.img, price: SKIN_PRICE[s.key], owned: isSkinOwned(s.key) })) },
    { type: 'room', title: '🏠 房间主题', items: ROOM_TRACK.filter(r => r.key !== 'night').map(r => ({ key: r.key, name: r.name, emoji: r.emoji, img: r.img, price: ROOM_PRICE[r.key], owned: isRoomOwned(r.key) })) },
    { type: 'furniture', title: '🛋️ 家具', items: FURNITURE.map(f => ({ key: f.key, name: f.name, emoji: f.emoji, img: f.img, price: FURN_PRICE[f.key], owned: ownedFurniture().includes(f.key) })) },
    { type: 'item', title: '🎒 道具(消耗品)', items: ITEMS.map(i => ({ key: i.key, name: i.name, emoji: i.emoji, img: i.img, price: ITEM_PRICE[i.key], consumable: true })) }
  ]
}

function grant(type, key) {
  if (type === 'skin') { if (!db.owned_skins) db.owned_skins = ['default']; if (!db.owned_skins.includes(key)) db.owned_skins.push(key) }
  else if (type === 'room') { if (!db.owned_rooms) db.owned_rooms = ['night']; if (!db.owned_rooms.includes(key)) db.owned_rooms.push(key) }
  else if (type === 'furniture') { if (!db.owned_furniture) db.owned_furniture = []; if (!db.owned_furniture.includes(key)) db.owned_furniture.push(key) }
  else if (type === 'item') { if (!db.items) db.items = {}; db.items[key] = (db.items[key] || 0) + 1 }
}

// 购买:返回 { ok, msg }
export function buy(type, key) {
  const price = priceOf(type, key)
  if (price == null) return { ok: false, msg: '没有这个商品' }
  if (type !== 'item' && ownedNow(type, key)) return { ok: false, msg: '已经拥有啦' }
  if (coinSvc.coins() < price) return { ok: false, msg: `还差 ${price - coinSvc.coins()} 星币,多打卡攒一攒 🪙` }
  coinSvc.spendCoins(price, `购买 ${type}:${key}`)
  grant(type, key)
  audit(child().id, 'shop', `${type}:${key}`, 'buy', { price })
  return { ok: true }
}
