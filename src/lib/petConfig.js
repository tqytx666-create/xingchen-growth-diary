// 宠物阶段、形态、进化规则(GAME_DESIGN.md / DOG_PET_SYSTEM_DESIGN.md)
export const STAGES = [
  { name: '初遇蛋', lv: 0, min: 0 },
  { name: '幼犬期', lv: 1, min: 0 },
  { name: '成长期', lv: 2, min: 40 },
  { name: '进阶犬', lv: 3, min: 90 },
  { name: '精英犬', lv: 4, min: 170 },
  { name: '星愿神犬', lv: 5, min: 320 }
]

export function dominant(a) {
  const m = { wisdom: a.wisdom, cleanliness: a.cleanliness, vitality: a.vitality, charm: a.charm }
  return Object.keys(m).reduce((x, y) => (m[y] > m[x] ? y : x))
}

export const FORM_LABEL = {
  wisdom: '会发光的学者犬 📚',
  cleanliness: '闪亮的香香犬 🛁',
  vitality: '敏捷的运动犬 🏸',
  charm: '优雅的魅力犬 ✨'
}

// 外观配置:皮肤优先,否则按阶段+主导属性推导
export function appearanceFor(pet, attrs) {
  if (pet.skin && pet.skin !== 'default') {
    const sk = SKINS.find(s => s.key === pet.skin)
    if (sk) return { ...sk.o, dim: isLow(pet) }
  }
  const o = { color: '#f5e6c8', ear: '#e8c89a' }
  const dom = dominant(attrs)
  if (pet.stage_idx >= 5) return { color: '#e8dcff', halo: true, wings: true, sparkle: true, dim: isLow(pet) }
  if (pet.stage_idx >= 3) {
    if (dom === 'wisdom') { o.glasses = true; o.sparkle = true }
    else if (dom === 'cleanliness') { o.towel = true; o.sparkle = true; o.color = '#eef6ff'; o.ear = '#cfe6ff' }
    else if (dom === 'vitality') { o.hat = true; o.racket = true }
    else if (dom === 'charm') { o.bowtie = true; o.collar = true; o.sparkle = true; o.color = '#ffeef6'; o.ear = '#ffd0e4' }
  } else if (pet.stage_idx >= 2) { o.bowtie = true }
  if (pet.stage_idx >= 4) o.sparkle = true
  o.dim = isLow(pet)
  return o
}

export function isLow(pet) {
  return pet.mood === 'low' || pet.mood === 'disappointed'
}

export const SKINS = [
  { key: 'default', t: '默认', d: '星愿犬本来的样子', rare: 'n', o: {}, unlock: () => true, why: '' },
  { key: 'scholar', t: '英语学者', d: '小圆眼镜 + 知识星光', rare: 'r', o: { glasses: true, sparkle: true }, unlock: a => a.wisdom >= 50, why: '智慧达到 50' },
  { key: 'fresh', t: '香香浴袍', d: '浴巾 + 闪亮毛发', rare: 'r', o: { towel: true, sparkle: true, color: '#eef6ff', ear: '#cfe6ff' }, unlock: a => a.cleanliness >= 45, why: '清洁达到 45' },
  { key: 'champ', t: '羽球冠军', d: '运动发带 + 小球拍', rare: 'e', o: { hat: true, racket: true, collar: true }, unlock: a => a.vitality >= 45, why: '活力达到 45' },
  { key: 'god', t: '星愿神犬', d: '传说级,星空光环', rare: 'l', o: { halo: true, wings: true, sparkle: true, color: '#e8dcff' }, unlock: (a, pet) => pet.stage_idx >= 5, why: '进化到 Lv.5' }
]

export const DEX = [
  { key: 'egg', t: '初遇蛋', d: '一切的起点', rare: 'n', o: { color: '#d8c8a8' }, cond: p => p.stage_idx >= 0 },
  { key: 'puppy', t: '幼犬期', d: '奶油白幼犬,亲近可爱', rare: 'n', o: {}, cond: p => p.stage_idx >= 1 },
  { key: 'grow', t: '成长期', d: '更活泼,会做更多动作', rare: 'n', o: { bowtie: true }, cond: p => p.stage_idx >= 2 },
  { key: 'wisdom', t: '智慧犬', d: '英语多 → 智慧倾向', rare: 'r', o: { glasses: true, sparkle: true }, cond: (p, a) => p.stage_idx >= 3 && dominant(a) === 'wisdom' },
  { key: 'clean', t: '香香犬', d: '清洁多 → 闪亮香香', rare: 'r', o: { towel: true, sparkle: true, color: '#eef6ff', ear: '#cfe6ff' }, cond: (p, a) => p.stage_idx >= 3 && dominant(a) === 'cleanliness' },
  { key: 'sport', t: '运动犬', d: '羽毛球多 → 活力倾向', rare: 'r', o: { hat: true, racket: true }, cond: (p, a) => p.stage_idx >= 3 && dominant(a) === 'vitality' },
  { key: 'charm', t: '魅力犬', d: '魅力高 → 优雅可爱', rare: 'e', o: { bowtie: true, collar: true, sparkle: true, color: '#ffeef6', ear: '#ffd0e4' }, cond: (p, a) => p.stage_idx >= 4 && dominant(a) === 'charm' },
  { key: 'elite', t: '精英犬', d: '外观完整,可穿高级皮肤', rare: 'e', o: { glasses: true, sparkle: true, bowtie: true }, cond: p => p.stage_idx >= 4 },
  { key: 'god', t: '星愿神犬', d: '多属性均衡 + 高信任', rare: 'l', o: { halo: true, wings: true, sparkle: true, color: '#e8dcff' }, cond: p => p.stage_idx >= 5 }
]

export const RARE_TXT = { n: '普通', r: '稀有', e: '史诗', l: '传说' }
