import { db, audit, bank } from '../lib/store.js'
import { nowISO, uid, round2 } from '../lib/util.js'
import { REWARDS } from '../lib/rewardConfig.js'
import * as bankSvc from './timeBankService.js'
import * as coinSvc from './coinService.js'
import { sideFullDays } from './streakService.js'

// 本周支线全勤短期奖励:按"支线全勤天数"达标即自动发放游戏时间(进时间银行),无需审批
export function checkWeeklyRewards(childId) {
  const s = db.streaks[0]
  if (!s) return []
  const wk = s.current_week_start
  const fullDays = sideFullDays()
  const granted = []
  for (const rule of db.weekly_reward_rules) {
    if (fullDays >= rule.required_days) {
      const already = db.weekly_claims.find(w => w.week_start === wk && w.required_days === rule.required_days)
      if (!already) {
        db.weekly_claims.push({ id: uid('wc_'), child_id: childId, week_start: wk, required_days: rule.required_days, reward_name: rule.reward_name, reward_type: rule.reward_type, claimed_at: nowISO() })
        if (rule.reward_type === 'time_bank' && rule.amount > 0) {
          bankSvc.addBonus({ minutes: rule.amount, description: `本周支线全勤满${rule.required_days}天奖励`, createdBy: 'system' })
        }
        granted.push(rule)
        audit('system', 'weekly_reward', wk, 'grant', { reward: rule.reward_name })
      }
    }
  }
  return granted
}

// 某奖励当前状态
export function rewardState(r, s) {
  const unlocked = r.check(s)
  const fulfilled = db.reward_requests.some(x => x.reward_id === r.id && x.status === 'fulfilled')
  const pending = db.reward_requests.some(x => x.reward_id === r.id && x.status === 'pending')
  return { unlocked, fulfilled, pending }
}

export function createRequest(rewardId, actorId) {
  const r = REWARDS.find(x => x.id === rewardId)
  if (!r) throw new Error('奖励不存在')
  const s = db.streaks[0]
  if (!r.check(s)) throw new Error('这个奖励还没解锁哦')
  if (r.milestone && db.reward_requests.some(x => x.reward_id === r.id && x.status === 'fulfilled')) throw new Error('这个奖励已经获得过啦')
  if (db.reward_requests.some(x => x.reward_id === r.id && x.status === 'pending')) throw new Error('已经申请过了,等家人处理')
  const req = {
    id: uid('rr_'), child_id: actorId, reward_id: r.id, reward_name: r.name, reward_type: r.type || 'reward',
    status: 'pending', requested_at: nowISO(), handled_by: null, handled_at: null
  }
  db.reward_requests.unshift(req)
  audit(actorId, 'reward_request', req.id, 'request', { reward: r.name })
  return req
}

// ---- 免断签卡(可持有道具)----
const FREEZE_CARD_ID = 'r_card_nostreak'
// 已持有(家长已批准、尚未使用)的免断签卡数量
export function ownedFreezeCards() {
  return db.reward_requests.filter(r => r.reward_id === FREEZE_CARD_ID && r.status === 'fulfilled' && !r.consumed_at).length
}
// 消耗一张免断签卡(补卡时调用);无可用则抛错
export function consumeFreezeCard(actorId) {
  const card = db.reward_requests.find(r => r.reward_id === FREEZE_CARD_ID && r.status === 'fulfilled' && !r.consumed_at)
  if (!card) throw new Error('没有可用的免断签卡')
  card.consumed_at = nowISO()
  audit(actorId, 'reward_request', card.id, 'consume_card', { reward: card.reward_name })
  return card
}

export function handleRequest(reqId, approve, actorId) {
  const req = db.reward_requests.find(x => x.id === reqId)
  if (!req || req.status !== 'pending') return
  req.status = approve ? 'fulfilled' : 'rejected'
  req.handled_by = actorId; req.handled_at = nowISO()
  // 心愿用星币付的,被拒绝就退星币
  if (!approve && req.cost_type === 'coin' && req.coin_cost) coinSvc.earnCoins(req.coin_cost, `退款:${req.reward_name}`)
  audit(actorId, 'reward_request', req.id, approve ? 'approve' : 'reject', { reward: req.reward_name })
}
