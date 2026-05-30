import { uid, todayStr, nowISO, weekStart } from './util.js'

// 第一版种子数据。对应 DATA_MODEL.md 的默认任务与初始宠物/账户。
export function buildSeed() {
  const child = { id: 'u_child', name: 'xingchen', display_name: '星晨', role: 'child', avatar: '🌟', created_at: nowISO() }
  const family = [
    { id: 'u_dad', name: 'dad', display_name: '爸爸', role: 'admin', avatar: '👨', created_at: nowISO() },
    { id: 'u_mom', name: 'mom', display_name: '妈妈', role: 'family', avatar: '👩', created_at: nowISO() },
    { id: 'u_grandma', name: 'grandma', display_name: '外婆', role: 'family', avatar: '👵', created_at: nowISO() },
    { id: 'u_grandpa', name: 'grandpa', display_name: '外公', role: 'family', avatar: '👴', created_at: nowISO() }
  ]

  const tEnglish = { id: 't_english', name: '英语学习一课', task_type: 'main', category: 'english', attribute_key: 'wisdom', base_exp: 9, icon: '📚', is_active: true, created_at: nowISO() }
  const tasks = [
    tEnglish,
    { id: 't_teeth', name: '刷牙', task_type: 'side', category: 'hygiene', attribute_key: 'cleanliness', base_exp: 6, icon: '🪥', is_active: true, created_at: nowISO() },
    { id: 't_bath', name: '洗头洗澡', task_type: 'side', category: 'hygiene', attribute_key: 'cleanliness', attribute_key2: 'charm', base_exp: 5, base_exp2: 5, icon: '🛁', is_active: true, created_at: nowISO() },
    { id: 't_badminton', name: '打羽毛球', task_type: 'side', category: 'sport', attribute_key: 'vitality', base_exp: 7, icon: '🏸', is_active: true, created_at: nowISO() }
  ]

  const pet = { id: 'pet_1', child_id: child.id, name: '小愿', species: '星愿犬', stage_idx: 1, mood: 'normal', risk: 0, evolution_seed: uid('seed_'), skin: 'default', created_at: nowISO() }
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
    weekly_reward_rules: [
      { required_days: 1, reward_name: '智慧星', reward_type: 'pet_exp' },
      { required_days: 3, reward_name: '小额游戏时间(+15分)', reward_type: 'time_bank', amount: 15 },
      { required_days: 5, reward_name: '特权卡碎片', reward_type: 'card_piece' },
      { required_days: 7, reward_name: '周满勤宝箱', reward_type: 'chest' }
    ],
    cumulative_reward_rules: [
      { streak: 7, reward_name: '名创优品小奖励', reward_type: 'item' },
      { streak: 14, reward_name: '家庭活动选择权', reward_type: 'family_activity' },
      { streak: 30, reward_name: '150 元以内大奖', reward_type: 'big_prize' }
    ],
    weekly_claims: [],
    credit_profile: [credit],
    credit_transactions: [],
    time_bank_accounts: [bank],
    time_bank_transactions: [],
    reward_catalog: [
      { id: 'r_game30', reward_name: '游戏时间 30 分钟', reward_type: 'game_time', cost_type: 'time_bank', base_cost: 30 },
      { id: 'r_game60', reward_name: '游戏时间 60 分钟', reward_type: 'game_time', cost_type: 'time_bank', base_cost: 60 },
      { id: 'r_miniso', reward_name: '名创优品小物', reward_type: 'item', cost_type: 'manual', base_cost: 0 },
      { id: 'r_dinner', reward_name: '晚餐决定权(特权卡)', reward_type: 'privilege_card', cost_type: 'manual', base_cost: 0 },
      { id: 'r_king', reward_name: '国王日(特权卡)', reward_type: 'privilege_card', cost_type: 'manual', base_cost: 0 },
      { id: 'r_nostreak', reward_name: '免断签卡(特权卡)', reward_type: 'privilege_card', cost_type: 'manual', base_cost: 0 }
    ],
    reward_requests: [],
    audit_logs: [],
    meta: { version: 1, created_at: nowISO() }
  }
}
