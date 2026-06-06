// 活宠物:全场景视频(狗+默认房间烘焙在一起),按动作切换。
// 每个"形态"一套(idle溜达 + 各动作),做一个形态补一套,加到 FORM_SETS 即可。
// 幼犬(stage1)
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

// 形态(stage_idx)→ 活视频套;6个形态全齐 🎉
const FORM_SETS = { 1: BASE, 2: EVO2, 3: EVO3, 4: EVO4, 5: EVO5, 6: GOD }
// 活皮肤(优先于形态);以后一套套补
const SKIN_SETS = {}

// 选当前该用哪套活视频:活皮肤优先;装了非活皮肤→不活(回落静态展示皮肤);默认皮肤→看形态
export function livingSet(pet) {
  if (!pet) return null
  const skin = pet.skin
  if (skin && skin !== 'default') return SKIN_SETS[skin] || null
  return FORM_SETS[pet.stage_idx || 0] || null
}

// 任务/互动 anim → 活宠物动作 key
export function actionForAnim(anim) {
  return ({ study: 'study', brush: 'brush', bath: 'bath', badminton: 'happy' })[anim] || 'happy'
}
