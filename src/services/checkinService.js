import { db, child, audit } from '../lib/store.js'
import { todayStr, nowISO, uid } from '../lib/util.js'
import * as streakSvc from './streakService.js'
import * as petSvc from './petService.js'
import * as rewardSvc from './rewardService.js'
import * as bankSvc from './timeBankService.js'

export function todayCheckins(date = todayStr()) {
  const cid = child().id
  return db.checkins.filter(c => c.child_id === cid && c.checkin_date === date)
}

export function statusOf(taskId, date = todayStr()) {
  const c = todayCheckins(date).find(x => x.task_id === taskId && x.status !== 'revoked')
  return c || null
}

// 星晨自主打卡:只记录 + 立刻计入签到(默认信任),宠物此刻不变化。
// 宠物互动要等家人核验通过后,在宠物页点道具才发生。
export function createCheckin(taskId, opts = {}) {
  const date = opts.date || todayStr()
  const task = db.tasks.find(t => t.id === taskId)
  if (!task) throw new Error('任务不存在')
  if (statusOf(taskId, date)) throw new Error('今天已经打过卡啦')

  const cid = child().id
  const checkin = {
    id: uid('c_'), task_id: taskId, child_id: cid, checkin_date: date,
    status: 'self_reported', self_reported_at: nowISO(),
    verified_by: null, verified_at: null, note: opts.note || null,
    photo_url: opts.photoUrl || null,
    interacted: false
  }
  db.checkins.unshift(checkin)

  let weeklyGranted = []
  if (task.task_type === 'main') {
    streakSvc.recompute()
    weeklyGranted = rewardSvc.checkWeeklyRewards(cid)
  }
  audit(cid, 'checkin', checkin.id, 'self_report', { task: task.name, date })
  return { checkin, weeklyGranted, task }
}

// 已确认、还没互动过的打卡 → 宠物页可点的道具
export function pendingInteractions() {
  const cid = child().id
  return db.checkins.filter(c => c.child_id === cid && c.status === 'confirmed' && !c.interacted)
}

// 星晨点道具和宠物互动:此时才长属性、放动画;支线小打卡开盲盒随机 +1~5 分钟
export function interact(checkinId) {
  const c = db.checkins.find(x => x.id === checkinId)
  if (!c || c.status !== 'confirmed' || c.interacted) return null
  const task = db.tasks.find(t => t.id === c.task_id)
  c.interacted = true
  const delta = petSvc.applyTaskExp(task, c.id)
  const evolved = petSvc.checkEvolution()
  // 开宝箱:确认互动后随机奖励游戏时间。宝箱分级:银1~3/金2~5/钻5~10(用 checkinId 派生稳定随机)
  let blindbox = 0, boxTier = null
  if (task.blindbox) {
    boxTier = BOX_TIER[task.id] || 'silver'
    const [lo, hi] = BOX_RANGE[boxTier]
    let h = 0; for (let i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) >>> 0
    blindbox = lo + (h % (hi - lo + 1))
    bankSvc.addBonus({ minutes: blindbox, description: `${BOX_NAME[boxTier]}奖励:${task.name}`, createdBy: 'system' })
  }
  // 支线打卡可能让本周"全勤天数"达标 → 触发自动奖励
  let weeklyGranted = []
  if (task.task_type === 'side') weeklyGranted = rewardSvc.checkWeeklyRewards(child().id)
  audit(child().id, 'checkin', c.id, 'interact', { task: task.name, blindbox })
  return { delta, evolved, task, blindbox, boxTier, weeklyGranted }
}

// 宝箱分级:银(刷牙/房间)金(洗澡)钻(洗头)
const BOX_TIER = { t_teeth_am: 'silver', t_teeth_pm: 'silver', t_room: 'silver', t_bath: 'gold', t_hair: 'diamond' }
const BOX_RANGE = { silver: [1, 3], gold: [2, 5], diamond: [5, 10] }
const BOX_NAME = { silver: '🥈银宝箱', gold: '🥇金宝箱', diamond: '💎钻石宝箱' }
