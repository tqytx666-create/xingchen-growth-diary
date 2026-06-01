-- 把当前宠物退回「初遇蛋」状态(孩子刚开始用,仅 1 次打卡/exp 4,无实质损失)。
-- 新增的蛋→孵化机制:seed 已让新装从蛋开始;此 patch 让现有这只也从蛋开始体验。
-- level→0, stage_idx→0;保留已有 exp(算进孵化进度),保留属性。
update xc_state
set data = jsonb_set(
  jsonb_set(data, '{pet_profile,0,level}', '0'::jsonb),
  '{pet_profile,0,stage_idx}', '0'::jsonb
),
updated_at = now()
where id = 1;
