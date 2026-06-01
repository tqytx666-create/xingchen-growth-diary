import { pet, streak, audit, child } from '../lib/store.js'
import { ROOM_TRACK, roomImg } from '../lib/petImages.js'
import { nowISO } from '../lib/util.js'

export function roomDays() { return streak().total_main_checkin_days || 0 }
export function currentRoom() { return pet().room || 'night' }
export function currentRoomImg() { return roomImg(currentRoom()) }

// 各房间 + 是否解锁 + 是否当前
export function roomTrackState() {
  const cur = currentRoom()
  return ROOM_TRACK.map(r => ({ ...r, unlocked: roomDays() >= r.days, selected: cur === r.key }))
}

// 切换房间(未解锁则失败)
export function equipRoom(key) {
  const r = ROOM_TRACK.find(x => x.key === key)
  if (!r || roomDays() < r.days) return false
  pet().room = key
  pet().updated_at = nowISO()
  audit(child().id, 'room', key, 'equip', { room: key })
  return true
}
