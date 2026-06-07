// 奖励规则(里程碑式,达成条件才解锁;不是天天能申请)
// metric: streak=按历史最长连续英语签到, week=按本周英语完成天数
// milestone: true=拿过一次就永久达成; false=可重复(满足条件且无在途申请时可再申请)
export const REWARDS = [
  { id: 'r_miniso', name: '名创优品小奖励', icon: '🛍️', desc: '连续英语签到 7 天', target: 7, metric: 'streak', milestone: true, check: s => s.longest_streak >= 7 },
  { id: 'r_card_nostreak', name: '免断签卡', icon: '🛡️', desc: '本周英语满勤 7 天', target: 7, metric: 'week', milestone: false, check: s => s.current_week_count >= 7 },
  { id: 'r_family', name: '家庭活动选择权', icon: '🎡', desc: '连续英语签到 14 天', target: 14, metric: 'streak', milestone: true, check: s => s.longest_streak >= 14 },
  { id: 'r_king', name: '国王日特权卡', icon: '👑', desc: '连续英语签到 21 天', target: 21, metric: 'streak', milestone: true, check: s => s.longest_streak >= 21 },
  { id: 'r_big', name: '150 元以内大奖', icon: '🎁', desc: '连续英语签到 30 天', target: 30, metric: 'streak', milestone: true, check: s => s.longest_streak >= 30 }
]

export function metricValue(r, s) {
  return r.metric === 'week' ? s.current_week_count : Math.max(s.longest_streak, s.current_streak)
}

// 连续英语打卡「里程碑大奖」:达成当天自动到账(宝箱 + 星币),并提示去领对应特权卡。
// 设计:偏星币(只能商城消费)+ 特权卡(现实特权,不给游戏时间),游戏时间只靠宝箱给一点点,
// 避免"奖励一堆游戏时间被马上花掉"。21 天=习惯养成里程碑,给最高级钻石宝箱,是英雄级节点。
export const STREAK_MILESTONES = [
  { days: 7,  box: 'gold',    coins: 50,  title: '坚持一整周啦!',           privilege: '名创优品小奖励' },
  { days: 14, box: 'gold',    coins: 100, title: '两周不间断,真稳!',         privilege: '家庭活动选择权' },
  { days: 21, box: 'diamond', coins: 200, title: '21 天 · 习惯养成里程碑!',   privilege: '👑 国王日特权卡', hero: true },
  { days: 30, box: 'diamond', coins: 300, title: '满一个月,了不起!',         privilege: '🎁 150 元以内大奖' }
]
export const BOX_LABEL = { silver: '🥈 银宝箱', gold: '🥇 金宝箱', diamond: '💎 钻石宝箱' }
