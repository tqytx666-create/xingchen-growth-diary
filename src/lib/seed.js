import { uid, todayStr, nowISO, weekStart } from './util.js'
import { SKIN_TRACK, ROOM_TRACK, FURNITURE } from './petImages.js'
import { tierFromLevel } from './petConfig.js'

export const SEED_VERSION = 4

// Demo 版(分享给朋友看):全解锁、有基础数据、打卡免确认。基于正式种子覆盖。
export function buildDemoSeed() {
  const s = buildSeed()
  s.coins = 9999
  s.owned_skins = ['default', ...SKIN_TRACK.map(x => x.key)]
  s.owned_rooms = ['night', ...ROOM_TRACK.map(x => x.key)]
  s.owned_furniture = FURNITURE.map(x => x.key)
  s.items = { bone: 9, fish: 9, ball: 9, wand: 9 }
  const p = s.pet_profile[0]
  if (p) { p.level = 19; p.exp = 70; p.stage_idx = tierFromLevel(19); p.mood = 'happy' }
  // demo 样例时间流水(近一周,让时间银行统计/图表是活的)
  const day = k => new Date(Date.now() - k * 86400000).toISOString()
  s.time_bank_accounts[0].current_balance_minutes = 480
  s.time_bank_accounts[0].last_interest_date = day(1)
  s.time_bank_transactions = [
    { id: 'tbi0', type: 'interest', screen_minutes: 186, description: '累计每日利息', created_at: day(25) },
    { id: 'tbd1', type: 'deposit', screen_minutes: 30, exercise_type: 'badminton', exercise_minutes: 15, description: '羽毛球存入', created_at: day(0) },
    { id: 'tbd2', type: 'interest', screen_minutes: 5, description: '✨ 收取每日利息', created_at: day(0) },
    { id: 'tbd3', type: 'withdraw', screen_minutes: -20, description: '玩游戏', created_at: day(0) },
    { id: 'tbd4', type: 'bonus', screen_minutes: 15, description: '金宝箱', created_at: day(1) },
    { id: 'tbd5', type: 'deposit', screen_minutes: 20, description: '跳绳存入', created_at: day(2) },
    { id: 'tbd6', type: 'interest', screen_minutes: 4, description: '每日利息', created_at: day(2) },
    { id: 'tbd7', type: 'withdraw', screen_minutes: -30, description: '玩游戏', created_at: day(3) },
    { id: 'tbd8', type: 'bonus', screen_minutes: 50, description: '本周全勤宝箱', created_at: day(4) },
    { id: 'tbd9', type: 'deposit', screen_minutes: 40, description: '羽毛球存入', created_at: day(5) },
    { id: 'tbd10', type: 'interest', screen_minutes: 3, description: '每日利息', created_at: day(6) }
  ]
  s.meta = { ...s.meta, demo: true }
  return s
}

// 第一版种子数据。对应 DATA_MODEL.md 的默认任务与初始宠物/账户。
export function buildSeed() {
  const child = { id: 'u_child', name: 'xingchen', display_name: '星晨', role: 'child', avatar: '🌟', created_at: nowISO() }
  const family = [
    { id: 'u_dad', name: 'dad', display_name: '爸爸', role: 'admin', avatar: '👨', created_at: nowISO() },
    { id: 'u_mom', name: 'mom', display_name: '妈妈', role: 'family', avatar: '👩', created_at: nowISO() },
    { id: 'u_grandma', name: 'grandma', display_name: '外婆', role: 'family', avatar: '👵', created_at: nowISO() },
    { id: 'u_grandpa', name: 'grandpa', display_name: '外公', role: 'family', avatar: '👴', created_at: nowISO() }
  ]

  const tEnglish = { id: 't_english', name: '孙立志老师课程', task_type: 'main', category: 'english', attribute_key: 'wisdom', base_exp: 9, icon: '📚', anim: 'study', is_active: true, created_at: nowISO() }
  // 支线小打卡:完成后开盲盒随机 +1~5 分钟游戏时间(blindbox:true)
  const tasks = [
    tEnglish,
    { id: 't_teeth_am', name: '早上刷牙', task_type: 'side', category: 'hygiene', attribute_key: 'cleanliness', base_exp: 4, icon: '🌞', anim: 'brush', blindbox: true, desc: '每天早上 · 清洁 +', is_active: true, created_at: nowISO() },
    { id: 't_teeth_pm', name: '晚上刷牙', task_type: 'side', category: 'hygiene', attribute_key: 'cleanliness', base_exp: 4, icon: '🌙', anim: 'brush', blindbox: true, desc: '每天晚上 · 清洁 +', is_active: true, created_at: nowISO() },
    { id: 't_bath', name: '洗澡', task_type: 'side', category: 'hygiene', attribute_key: 'cleanliness', base_exp: 5, icon: '🛁', anim: 'bath', blindbox: true, desc: '每天一次 · 清洁 +', is_active: true, created_at: nowISO() },
    { id: 't_hair', name: '洗头', task_type: 'side', category: 'hygiene', attribute_key: 'cleanliness', attribute_key2: 'charm', base_exp: 5, base_exp2: 5, icon: '🚿', anim: 'bath', blindbox: true, desc: '3 天内至少一次 · 清洁 + 魅力 +', is_active: true, created_at: nowISO() },
    { id: 't_room', name: '保持房间整洁', task_type: 'side', category: 'chore', attribute_key: 'cleanliness', base_exp: 4, icon: '🧹', anim: '', blindbox: true, desc: '每天 · 清洁 +', is_active: true, created_at: nowISO() },
    { id: 't_badminton', name: '打羽毛球', task_type: 'side', category: 'sport', attribute_key: 'vitality', base_exp: 7, icon: '🏸', anim: 'badminton', desc: '支线 · 活力 + 运动时间', is_active: true, created_at: nowISO() },
    // 英语上课(外教课):有课才打,家长确认时手动输入换多少游戏时间(lesson:true)
    { id: 't_english_class', name: '英语上课(外教)', task_type: 'lesson', category: 'english', attribute_key: 'wisdom', base_exp: 9, icon: '🎧', anim: 'study', lesson: true, desc: '上完外教课打卡 · 家长确认换游戏时间', is_active: true, created_at: nowISO() },
    // 英语老师布置的每日作业(百词斩 + ABC Reading 合并成一个必做卡;算英语主线)
    { id: 't_homework', name: '每日作业', task_type: 'side', category: 'english', attribute_key: 'wisdom', base_exp: 8, icon: '📝', anim: 'study', blindbox: true, desc: '百词斩(背5+复习5)· ABC Reading(3本/Level A)', is_active: true, created_at: nowISO() }
  ]

  // 初始是「初遇蛋」(level 0 / stage 0),坚持打卡攒够 HATCH_EXP 经验才孵化成幼犬
  const pet = { id: 'pet_1', child_id: child.id, name: '小愿', species: '星愿犬', level: 0, exp: 0, stage_idx: 0, mood: 'normal', risk: 0, evolution_seed: uid('seed_'), skin: 'default', room: 'night', created_at: nowISO() }
  const petAttrs = { id: 'pa_1', pet_id: pet.id, wisdom: 12, cleanliness: 8, vitality: 6, charm: 4, mood_score: 70, trust_bond: 50, updated_at: nowISO() }

  const streak = {
    id: 'streak_1', child_id: child.id, main_task_id: tEnglish.id,
    current_streak: 0, longest_streak: 0, total_main_checkin_days: 0,
    current_week_start: weekStart(todayStr()), current_week_count: 0, updated_at: nowISO()
  }

  const credit = { id: 'credit_1', child_id: child.id, credit_score: 100, credit_level: '完全信任', reward_discount_rate: 1, updated_at: nowISO() }
  const bank = { id: 'bank_1', child_id: child.id, current_balance_minutes: 0, last_interest_date: todayStr(), interest_enabled: true, daily_interest_rate: 0.01, updated_at: nowISO() }

  return {
    users: [child, ...family],
    tasks,
    checkins: [],
    verification_logs: [],
    pet_profile: [pet],
    pet_attributes: [petAttrs],
    pet_events: [],
    streaks: [streak],
    // 本周"支线全勤"短期自动奖励——按支线全勤天数发放,达成即自动到账游戏时间,无需审批。
    // 全勤=当天 早刷牙+晚刷牙+洗澡+房间整洁 都打卡。三档全拿=10+20+50=80 分。
    weekly_reward_rules: [
      { required_days: 3, reward_name: '坚持小奖励:游戏时间 +10 分', reward_type: 'time_bank', amount: 10 },
      { required_days: 5, reward_name: '加油奖励:游戏时间 +20 分', reward_type: 'time_bank', amount: 20 },
      { required_days: 7, reward_name: '本周全勤宝箱:游戏时间 +50 分', reward_type: 'time_bank', amount: 50 }
    ],
    cumulative_reward_rules: [
      { streak: 7, reward_name: '名创优品小奖励' },
      { streak: 14, reward_name: '家庭活动选择权' },
      { streak: 21, reward_name: '国王日特权卡' },
      { streak: 30, reward_name: '150 元以内大奖' }
    ],
    weekly_claims: [],
    boxes: [],
    coins: 0,
    items: { bone: 2, fish: 2, ball: 1, wand: 1 },
    furniture: {},
    owned_skins: ['default'],
    owned_rooms: ['night'],
    owned_furniture: [],
    credit_profile: [credit],
    credit_transactions: [],
    time_bank_accounts: [bank],
    time_bank_transactions: [],
    reward_requests: [],
    audit_logs: [],
    meta: { version: SEED_VERSION, created_at: nowISO() }
  }
}
