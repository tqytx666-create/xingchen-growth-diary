// 活宠物:全场景视频(狗+默认房间烘焙在一起),按动作切换。
// 每个"形态"一套(idle溜达 + 各动作),做一个形态补一套,加到 FORM_SETS 即可。
// 幼犬(stage1)
import { effectiveStage } from './petConfig.js'
import b_walk from '../assets/living/scene_walk.mp4'
import b_brush from '../assets/living/scene_brush.mp4'
import b_study from '../assets/living/scene_study.mp4'
import b_bath from '../assets/living/scene_bath.mp4'
import b_eat from '../assets/living/scene_eat.mp4'
import b_happy from '../assets/living/scene_happy.mp4'
// 星纹犬(stage2)
import e2_walk from '../assets/living/scene_evo2_walk.mp4'
import e2_brush from '../assets/living/scene_evo2_brush.mp4'
import e2_study from '../assets/living/scene_evo2_study.mp4'
import e2_bath from '../assets/living/scene_evo2_bath.mp4'
import e2_eat from '../assets/living/scene_evo2_eat.mp4'
import e2_happy from '../assets/living/scene_evo2_happy.mp4'
// 翼星犬(stage3)
import e3_walk from '../assets/living/scene_evo3_walk.mp4'
import e3_brush from '../assets/living/scene_evo3_brush.mp4'
import e3_study from '../assets/living/scene_evo3_study.mp4'
import e3_bath from '../assets/living/scene_evo3_bath.mp4'
import e3_eat from '../assets/living/scene_evo3_eat.mp4'
import e3_happy from '../assets/living/scene_evo3_happy.mp4'
// 辉光犬(stage4)
import e4_walk from '../assets/living/scene_evo4_walk.mp4'
import e4_brush from '../assets/living/scene_evo4_brush.mp4'
import e4_study from '../assets/living/scene_evo4_study.mp4'
import e4_bath from '../assets/living/scene_evo4_bath.mp4'
import e4_eat from '../assets/living/scene_evo4_eat.mp4'
import e4_happy from '../assets/living/scene_evo4_happy.mp4'
// 御星犬(stage5)
import e5_walk from '../assets/living/scene_evo5_walk.mp4'
import e5_brush from '../assets/living/scene_evo5_brush.mp4'
import e5_study from '../assets/living/scene_evo5_study.mp4'
import e5_bath from '../assets/living/scene_evo5_bath.mp4'
import e5_eat from '../assets/living/scene_evo5_eat.mp4'
import e5_happy from '../assets/living/scene_evo5_happy.mp4'
// 星愿神犬(stage6)
import g_walk from '../assets/living/scene_god_walk.mp4'
import g_brush from '../assets/living/scene_god_brush.mp4'
import g_study from '../assets/living/scene_god_study.mp4'
import g_bath from '../assets/living/scene_god_bath.mp4'
import g_eat from '../assets/living/scene_god_eat.mp4'
import g_happy from '../assets/living/scene_god_happy.mp4'

const BASE = { idle: b_walk, brush: b_brush, study: b_study, bath: b_bath, eat: b_eat, happy: b_happy }
const EVO2 = { idle: e2_walk, brush: e2_brush, study: e2_study, bath: e2_bath, eat: e2_eat, happy: e2_happy }
const EVO3 = { idle: e3_walk, brush: e3_brush, study: e3_study, bath: e3_bath, eat: e3_eat, happy: e3_happy }
const EVO4 = { idle: e4_walk, brush: e4_brush, study: e4_study, bath: e4_bath, eat: e4_eat, happy: e4_happy }
const EVO5 = { idle: e5_walk, brush: e5_brush, study: e5_study, bath: e5_bath, eat: e5_eat, happy: e5_happy }
const GOD = { idle: g_walk, brush: g_brush, study: g_study, bath: g_bath, eat: g_eat, happy: g_happy }

// 形态(stage_idx)→ 活视频套。新编号:1幼犬…5御星,15神犬;中间新形态(6-14)暂回落御星活视频
const FORM_SETS = { 1: BASE, 2: EVO2, 3: EVO3, 4: EVO4, 5: EVO5, 15: GOD }
// 活皮肤(优先于形态);逐款补。每款2段:idle溜达 + 摸摸开心(其余动作复用开心)
function skinSet(walk, happy) { return { idle: walk, happy, brush: happy, study: happy, bath: happy, eat: happy } }
// 🎀 粉蝴蝶结
import sk_bow_walk from '../assets/living/skin_bow_walk.mp4'
import sk_bow_happy from '../assets/living/skin_bow_happy.mp4'
// 🧣 冬日围巾
import sk_scarf_walk from '../assets/living/skin_scarf_walk.mp4'
import sk_scarf_happy from '../assets/living/skin_scarf_happy.mp4'
// 🌧️ 黄色雨衣
import sk_rain_walk from '../assets/living/skin_rain_walk.mp4'
import sk_rain_happy from '../assets/living/skin_rain_happy.mp4'
// 😴 星星睡帽
import sk_sleep_walk from '../assets/living/skin_sleep_walk.mp4'
import sk_sleep_happy from '../assets/living/skin_sleep_happy.mp4'
// 🧚 精灵翅膀
import sk_wings_walk from '../assets/living/skin_wings_walk.mp4'
import sk_wings_happy from '../assets/living/skin_wings_happy.mp4'
// 🧙 小魔法师
import sk_wizard_walk from '../assets/living/skin_wizard_walk.mp4'
import sk_wizard_happy from '../assets/living/skin_wizard_happy.mp4'
// 🍓 草莓装
import sk_berry_walk from '../assets/living/skin_berry_walk.mp4'
import sk_berry_happy from '../assets/living/skin_berry_happy.mp4'
const SKIN_SETS = {
  bow: skinSet(sk_bow_walk, sk_bow_happy),
  scarf: skinSet(sk_scarf_walk, sk_scarf_happy),
  rain: skinSet(sk_rain_walk, sk_rain_happy),
  sleep: skinSet(sk_sleep_walk, sk_sleep_happy),
  wings: skinSet(sk_wings_walk, sk_wings_happy),
  wizard: skinSet(sk_wizard_walk, sk_wizard_happy),
  berry: skinSet(sk_berry_walk, sk_berry_happy)
}

// 选当前该用哪套活视频:活皮肤优先;装了非活皮肤→不活(回落静态展示皮肤);默认皮肤→看形态
export function livingSet(pet) {
  if (!pet) return null
  const skin = pet.skin
  if (skin && skin !== 'default') return SKIN_SETS[skin] || null
  const idx = effectiveStage(pet)
  if (FORM_SETS[idx]) return FORM_SETS[idx]
  // 没有专属活视频的形态(蛋 / f6流光~f14天河):回落静态立绘(显示正确形态),不再错播御星视频
  return null
}

// 任务/互动 anim → 活宠物动作 key
export function actionForAnim(anim) {
  return ({ study: 'study', brush: 'brush', bath: 'bath', badminton: 'happy' })[anim] || 'happy'
}
