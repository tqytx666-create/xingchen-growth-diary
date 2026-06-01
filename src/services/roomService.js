import { db, pet, audit, child } from '../lib/store.js'
import { ROOM_TRACK, roomImg } from '../lib/petImages.js'
import { nowISO } from '../lib/util.js'

// 拥有的房间(night 默认拥有);其余通过商城购买
export function ownedRooms() { return db.owned_rooms || ['night'] }
export function isRoomOwned(key) { return key === 'night' || ownedRooms().includes(key) }
export function currentRoom() { return pet().room || 'night' }
export function currentRoomImg() { return roomImg(currentRoom()) }

export function roomTrackState() {
  const cur = currentRoom()
  return ROOM_TRACK.map(r => ({ ...r, owned: isRoomOwned(r.key), selected: cur === r.key }))
}

// 切换房间(未拥有不可)
export function equipRoom(key) {
  if (!isRoomOwned(key)) return false
  pet().room = key
  pet().updated_at = nowISO()
  audit(child().id, 'room', key, 'equip', { room: key })
  return true
}
