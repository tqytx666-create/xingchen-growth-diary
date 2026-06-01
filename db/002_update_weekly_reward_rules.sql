-- 全勤奖励数额调整:旧 10/15/30 → 新 10/20/50,并更名(与 seed.js 对齐)。
-- 背景:weekly_reward_rules 是 xc_state 里的已存数据,改 seed.js 只影响全新安装;
--       不升 SEED_VERSION(升级会清空孩子全部进度),改用 jsonb_set 原地 patch 这一个字段。
-- 影响范围:仅 xc_state.data->weekly_reward_rules,宠物/打卡/时间银行等其余数据不动。
update xc_state
set data = jsonb_set(
  data,
  '{weekly_reward_rules}',
  '[
    {"required_days":3,"reward_name":"坚持小奖励:游戏时间 +10 分","reward_type":"time_bank","amount":10},
    {"required_days":5,"reward_name":"加油奖励:游戏时间 +20 分","reward_type":"time_bank","amount":20},
    {"required_days":7,"reward_name":"本周全勤宝箱:游戏时间 +50 分","reward_type":"time_bank","amount":50}
  ]'::jsonb
),
updated_at = now()
where id = 1;
