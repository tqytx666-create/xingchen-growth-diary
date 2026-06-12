import { db, pet, audit, child } from '../lib/store.js'
import { SKIN_TRACK } from '../lib/petImages.js'
import { hasLivingSkin } from '../lib/living.js'
import { nowISO } from '../lib/util.js'

// 拥有的皮肤(default 永远拥有);皮肤通过商城用星币购买
export function ownedSkins() { return db.owned_skins || ['default'] }
export function isSkinOwned(key) { return key === 'default' || ownedSkins().includes(key) }

// 全部皮肤 + 是否拥有 + 是否装扮中 + 是否会动
export function skinTrackState() {
  const cur = pet().skin || 'default'
  return SKIN_TRACK.map(s => ({ ...s, owned: isSkinOwned(s.key), equipped: cur === s.key, animated: hasLivingSkin(s.key) }))
}

// 装扮 / 脱下(传 'default' 脱下);未拥有不可装扮
export function equipSkin(key) {
  if (key !== 'default' && !isSkinOwned(key)) return false
  pet().skin = key
  pet().updated_at = nowISO()
  audit(child().id, 'skin', key, 'equip', { skin: key })
  return true
}
