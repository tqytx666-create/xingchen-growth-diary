import { db, credit, bank, audit } from '../lib/store.js'
import { todayStr, nowISO, uid, round2 } from '../lib/util.js'
import * as bankSvc from './timeBankService.js'

// 周奖励:达到门槛自动发放一次(记入 weekly_claims)
export function checkWeeklyRewards(childId) {
  const s = db.streaks[0]
  const wk = s.current_week_start
  const granted = []
  for (const rule of db.weekly_reward_rules) {
    if (s.current_week_count >= rule.required_days) {
      const already = db.weekly_claims.find(w => w.week_start === wk && w.required_days === rule.required_days)
      if (!already) {
        db.weekly_claims.push({ id: uid('wc_'), child_id: childId, week_start: wk, required_days: rule.required_days, reward_name: rule.reward_name, reward_type: rule.reward_type, claimed_at: nowISO() })
        if (rule.reward_type === 'time_bank' && rule.amount) {
          bankSvc.addBonus({ minutes: rule.amount, description: `周签到奖励:${rule.reward_name}`, createdBy: 'system' })
        }
        granted.push(rule)
        audit('system', 'weekly_reward', wk, 'grant', { reward: rule.reward_name })
      }
    }
  }
  return granted
}

export function discountRate() {
  return credit().reward_discount_rate || 1
}

// 兑换申请
export function createRequest(rewardId, actorId) {
  const r = db.reward_catalog.find(x => x.id === rewardId)
  if (!r) throw new Error('奖励不存在')
  const rate = discountRate()
  const finalCost = round2((r.base_cost || 0) * rate)
  if (r.cost_type === 'time_bank' && finalCost > Math.floor(bank().current_balance_minutes)) {
    throw new Error('时间银行余额不足')
  }
  const req = {
    id: uid('rr_'), child_id: actorId, reward_id: r.id, reward_name: r.reward_name, reward_type: r.reward_type,
    cost_type: r.cost_type, base_cost: r.base_cost || 0, discount_rate_snapshot: rate, final_cost: finalCost,
    status: 'pending', requested_at: nowISO(), handled_by: null, handled_at: null
  }
  db.reward_requests.unshift(req)
  audit(actorId, 'reward_request', req.id, 'request', { reward: r.reward_name })
  return req
}

export function handleRequest(reqId, approve, actorId) {
  const req = db.reward_requests.find(x => x.id === reqId)
  if (!req || req.status !== 'pending') return
  if (approve) {
    if (req.cost_type === 'time_bank' && req.final_cost > 0) {
      bankSvc.spendMinutes({ minutes: req.final_cost, description: `兑换:${req.reward_name}`, createdBy: actorId })
    }
    req.status = 'fulfilled'
  } else {
    req.status = 'rejected'
  }
  req.handled_by = actorId; req.handled_at = nowISO()
  audit(actorId, 'reward_request', req.id, approve ? 'approve' : 'reject', { reward: req.reward_name })
}
