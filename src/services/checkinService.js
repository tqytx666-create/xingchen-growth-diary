import { db, child, audit, mainTask, pet, IS_DEMO } from '../lib/store.js'
import { todayStr, nowISO, uid } from '../lib/util.js'
import { rewardMultiplier } from '../lib/petConfig.js'
import * as streakSvc from './streakService.js'
import * as petSvc from './petService.js'
import * as rewardSvc from './rewardService.js'
import * as bankSvc from './timeBankService.js'
import * as itemSvc from './itemService.js'
import * as coinSvc from './coinService.js'
import { COIN_PER_MAIN, COIN_PER_SIDE } from '../lib/shop.js'

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
    status: IS_DEMO ? 'confirmed' : 'self_reported', self_reported_at: nowISO(),
    verified_by: IS_DEMO ? 'demo' : null, verified_at: IS_DEMO ? nowISO() : null, note: opts.note || null,
    photo_url: opts.photoUrl || null,
    make_up: !!opts.makeUp,
    interacted: false
  }
  db.checkins.unshift(checkin)

  let weeklyGranted = []
  if (streakSvc.isMainStreakTask(task)) {   // 英语自学 或 外教课 任一 → 重算连续签到
    streakSvc.recompute()
    weeklyGranted = rewardSvc.checkWeeklyRewards(cid)
  }
  audit(cid, 'checkin', checkin.id, 'self_report', { task: task.name, date })
  return { checkin, weeklyGranted, task }
}

// 日历补卡:给某个过去的日子补一条打卡(自报,需家长核验)。已打过/未来日期会被拦。
export function requestMakeup(taskId, date) {
  if (date > todayStr()) throw new Error('不能补未来的卡')
  return createCheckin(taskId, { date, makeUp: true, note: '补卡' })
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
  let boxTier = null, coinsOnly = false
  if (task.blindbox) {
    boxTier = BOX_TIER[task.id] || 'bronze'
  } else if (task.category === 'sport' || task.lesson) {
    // 运动/外教课已直接换游戏时间 → 宝箱"只送星币不送时间";运动满60分钟那次升钻石
    coinsOnly = true
    const exMin = c.exercise_minutes || c.game_minutes || 0
    boxTier = exMin >= 60 ? 'diamond' : (task.lesson ? 'gold' : 'silver')
  }
  // 日常奖励总倍率:健康差→<1(生病0);健康满+连续坚持→>1 超额(最高1.5),既放大金币也升宝箱档。
  // 英语主线打卡(task_type==='main')固定全额,不受此影响。
  const curStreak = (db.streaks && db.streaks[0] && db.streaks[0].current_streak) || 0
  const m = rewardMultiplier(pet().health, curStreak)
  const isMain = task.task_type === 'main'
  // 宝箱:生病(m 0)不发;精神超好(m>1)按超出部分概率「升一档」(银→金→钻)
  if (boxTier) {
    if (m === 0) boxTier = null
    else if (m > 1 && Math.random() < (m - 1)) {
      const i = BOX_ORDER.indexOf(boxTier)
      if (i >= 0 && i < BOX_ORDER.length - 1) boxTier = BOX_ORDER[i + 1]
    }
  }
  if (boxTier) {
    if (!db.boxes) db.boxes = []
    db.boxes.unshift({ id: uid('bx_'), tier: boxTier, source_task: task.name, earned_at: nowISO(), opened_at: null, minutes: null, coinsOnly })
  }
  // 打卡互动发星币:英语主线 +10 / 支线 +5,都 × 倍率(健康差少给/生病不给;满血连签超额给)。只有「连续签到里程碑」奖励另行保护。
  const payCoin = Math.round((isMain ? COIN_PER_MAIN : COIN_PER_SIDE) * m)
  const coinsEarned = payCoin > 0 ? coinSvc.earnCoins(payCoin, `打卡:${task.name}`) : 0
  // 属性满值晋级:已拥有专属皮肤时改发星币(60)
  if (delta && delta.promotions) for (const pr of delta.promotions) if (pr.needCoin) coinSvc.earnCoins(60, '属性满值晋级奖励')
  // 支线打卡可能让本周"全勤天数"达标 → 触发自动奖励
  let weeklyGranted = []
  if (task.task_type === 'side') weeklyGranted = rewardSvc.checkWeeklyRewards(child().id)
  audit(child().id, 'checkin', c.id, 'interact', { task: task.name, boxTier, coins: coinsEarned })
  return { delta, task, boxTier, weeklyGranted, coinsEarned }
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

// 宝箱 5 档:铁 < 铜 < 银 < 金 < 钻。日常打卡按重要度配档;钻石留给里程碑(及将来运动满60分钟)。
const BOX_TIER = {
  t_teeth_am: 'iron', t_teeth_pm: 'iron',         // 每日刷牙:铁
  t_room: 'bronze', t_sleep: 'bronze',            // 房间整洁 / 按时睡觉:铜
  t_bath: 'silver', t_homework: 'silver', t_focus: 'silver',  // 洗澡 / 每日作业 / 专注不拖延:银
  t_class_helper: 'silver',                       // 班级小管家(学校每日职责):银
  t_hair: 'gold'                                  // 洗头(3天一次,较珍贵):金
}
const BOX_RANGE = { iron: [1, 2], bronze: [2, 3], silver: [2, 4], gold: [4, 6], diamond: [8, 12] }  // 开箱游戏时间(分钟)
const BOX_COIN = { iron: [3, 6], bronze: [5, 10], silver: [8, 14], gold: [12, 20], diamond: [25, 40] }  // 开箱星币
const BOX_DROP = { iron: 0.22, bronze: 0.32, silver: 0.45, gold: 0.6, diamond: 0.8 }   // 额外掉道具概率(按档递增)
const BOX_NAME = { iron: '🔩 铁宝箱', bronze: '🥉 铜宝箱', silver: '🥈 银宝箱', gold: '🥇 金宝箱', diamond: '💎 钻石宝箱' }
const BOX_ORDER = ['iron', 'bronze', 'silver', 'gold', 'diamond']

// 未开封宝箱各档数量
export function ownedBoxes() {
  const c = { iron: 0, bronze: 0, silver: 0, gold: 0, diamond: 0 }
  for (const b of (db.boxes || [])) if (!b.opened_at) c[b.tier] = (c[b.tier] || 0) + 1
  return c
}
// 打开某档里最早获得的一个未开宝箱:抽随机分钟 → 入时间银行 → 标记已开。返回 { tier, minutes }
export function openOneByTier(tier) {
  const box = (db.boxes || []).filter(b => b.tier === tier && !b.opened_at).pop()
  if (!box) return null
  let h = 0; for (let i = 0; i < box.id.length; i++) h = (h * 31 + box.id.charCodeAt(i)) >>> 0
  // 运动/外教宝箱(coinsOnly):不发游戏时间(运动已直接换过),星币按"高一档"补偿
  let minutes = 0
  if (!box.coinsOnly) {
    const [lo, hi] = BOX_RANGE[box.tier] || BOX_RANGE.silver
    minutes = lo + (h % (hi - lo + 1))
    bankSvc.addBonus({ minutes, description: `${BOX_NAME[box.tier]}:${box.source_task || ''}`, createdBy: 'system' })
  }
  box.opened_at = nowISO(); box.minutes = minutes
  // 开箱随机送星币(按档递增;coinsOnly 用高一档,补偿没有时间)
  const coinTier = box.coinsOnly ? (BOX_ORDER[Math.min(BOX_ORDER.length - 1, BOX_ORDER.indexOf(box.tier) + 1)]) : box.tier
  const [clo, chi] = BOX_COIN[coinTier] || BOX_COIN.silver
  const coins = clo + Math.floor(Math.random() * (chi - clo + 1))
  coinSvc.earnCoins(coins, `${BOX_NAME[box.tier]}开箱`)
  box.coins = coins
  // 额外掉落道具概率,按档递增(铁 0.22 → 钻 0.8)
  let item = null
  const dropRate = BOX_DROP[box.tier] ?? 0.45
  if (Math.random() < dropRate) item = itemSvc.giveRandomItem()
  audit(child().id, 'box', box.id, 'open', { tier: box.tier, minutes, coins, item: item?.key || null, coinsOnly: !!box.coinsOnly })
  return { tier: box.tier, minutes, coins, item, coinsOnly: !!box.coinsOnly }
}
