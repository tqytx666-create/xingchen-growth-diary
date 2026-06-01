import { db, child, audit, mainTask } from '../lib/store.js'
import { todayStr, nowISO, uid } from '../lib/util.js'
import * as streakSvc from './streakService.js'
import * as petSvc from './petService.js'
import * as rewardSvc from './rewardService.js'
import * as bankSvc from './timeBankService.js'
import * as itemSvc from './itemService.js'

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
  if (!task) return null
  c.interacted = true
  const delta = petSvc.applyTaskExp(task, c.id)
  // 获得宝箱:不当场开,发一个"未开封宝箱"进库存,星晨去奖励页自己点击开箱(延迟满足,仪式感更强)
  let boxTier = null
  if (task.blindbox) {
    boxTier = BOX_TIER[task.id] || 'silver'
    if (!db.boxes) db.boxes = []
    db.boxes.unshift({ id: uid('bx_'), tier: boxTier, source_task: task.name, earned_at: nowISO(), opened_at: null, minutes: null })
  }
  // 支线打卡可能让本周"全勤天数"达标 → 触发自动奖励
  let weeklyGranted = []
  if (task.task_type === 'side') weeklyGranted = rewardSvc.checkWeeklyRewards(child().id)
  audit(child().id, 'checkin', c.id, 'interact', { task: task.name, boxTier })
  return { delta, task, boxTier, weeklyGranted }
}

// 用免断签卡补录某天的英语打卡:消耗 1 张卡 → 补一条该日已确认的英语打卡 → 桥接连续天数。
// make_up 标记:不发宠物经验、不开宝箱(只是把断掉的连续接上),全程审计留痕。
export function makeUpMissedDay(date, actorId) {
  const missed = streakSvc.missedMainDays()
  if (!missed.includes(date)) throw new Error('这一天不能补卡(只能补本周漏打的英语日)')
  rewardSvc.consumeFreezeCard(actorId)   // 无卡会抛错,补卡随之中止
  const cid = child().id
  const checkin = {
    id: uid('c_'), task_id: mainTask().id, child_id: cid, checkin_date: date,
    status: 'confirmed', self_reported_at: nowISO(),
    verified_by: actorId, verified_at: nowISO(), note: '补卡(免断签卡)',
    photo_url: null, interacted: true, make_up: true
  }
  db.checkins.unshift(checkin)
  streakSvc.recompute()
  audit(cid, 'checkin', checkin.id, 'make_up', { date })
  return checkin
}

// 宝箱分级:银(刷牙/房间)金(洗澡/洗头)。钻石档暂不分配给任何任务。
const BOX_TIER = { t_teeth_am: 'silver', t_teeth_pm: 'silver', t_room: 'silver', t_bath: 'gold', t_hair: 'gold' }
const BOX_RANGE = { silver: [1, 3], gold: [2, 5], diamond: [5, 10] }
const BOX_NAME = { silver: '🥈银宝箱', gold: '🥇金宝箱', diamond: '💎钻石宝箱' }

// 未开封宝箱各档数量
export function ownedBoxes() {
  const c = { silver: 0, gold: 0, diamond: 0 }
  for (const b of (db.boxes || [])) if (!b.opened_at) c[b.tier] = (c[b.tier] || 0) + 1
  return c
}
// 打开某档里最早获得的一个未开宝箱:抽随机分钟 → 入时间银行 → 标记已开。返回 { tier, minutes }
export function openOneByTier(tier) {
  const box = (db.boxes || []).filter(b => b.tier === tier && !b.opened_at).pop()
  if (!box) return null
  const [lo, hi] = BOX_RANGE[box.tier] || BOX_RANGE.silver
  let h = 0; for (let i = 0; i < box.id.length; i++) h = (h * 31 + box.id.charCodeAt(i)) >>> 0
  const minutes = lo + (h % (hi - lo + 1))
  box.opened_at = nowISO(); box.minutes = minutes
  bankSvc.addBonus({ minutes, description: `${BOX_NAME[box.tier]}:${box.source_task || ''}`, createdBy: 'system' })
  // 约 45% 概率额外掉落一个道具(金/钻箱概率更高)
  let item = null
  const dropRate = box.tier === 'silver' ? 0.4 : 0.6
  if (Math.random() < dropRate) item = itemSvc.giveRandomItem()
  audit(child().id, 'box', box.id, 'open', { tier: box.tier, minutes, item: item?.key || null })
  return { tier: box.tier, minutes, item }
}
