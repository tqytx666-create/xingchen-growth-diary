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

const BASE = { idle: b_walk, brush: b_brush, study: b_study, bath: b_bath, eat: b_eat, happy: b_happy }
const EVO2 = { idle: e2_walk, brush: e2_brush, study: e2_study, bath: e2_bath, eat: e2_eat, happy: e2_happy }

// 形态(stage_idx)→ 活视频套;没列的形态(进阶/神犬)暂回落静态,以后补
const FORM_SETS = { 1: BASE, 2: EVO2 }
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
