import { db, audit, child } from '../lib/store.js'

// 星币:只能通过打卡互动获得,在商城消费。
export function coins() { return db.coins || 0 }

export function earnCoins(n, reason) {
  if (!(n > 0)) return 0
  db.coins = (db.coins || 0) + n
  audit(child().id, 'coin', 'earn', reason || '打卡', { n })
  return n
}

// 花费星币,余额不足返回 false
export function spendCoins(n, reason) {
  if ((db.coins || 0) < n) return false
  db.coins = (db.coins || 0) - n
  audit(child().id, 'coin', 'spend', reason || '商城购买', { n })
  return true
}
