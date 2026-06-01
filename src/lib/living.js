// 活宠物:全场景视频(狗+默认房间烘焙在一起),按动作切换。
// 每套"活皮肤"= idle(溜达) + 各动作视频。默认狗先做;贵价皮肤以后一套套补(加到这里即可)。
import walk from '../assets/living/scene_walk.mp4'
import brush from '../assets/living/scene_brush.mp4'
import study from '../assets/living/scene_study.mp4'
import bath from '../assets/living/scene_bath.mp4'
import eat from '../assets/living/scene_eat.mp4'
import happy from '../assets/living/scene_happy.mp4'

export const LIVING = {
  default: { idle: walk, brush, study, bath, eat, happy }
}
// 当前皮肤是否有"活视频"一套
export function livingSet(skin) { return LIVING[skin || 'default'] || null }
export function isLivingSkin(skin) { return !!LIVING[skin || 'default'] }

// 任务/互动 → 活宠物动作视频 key
export function actionForAnim(anim) {
  return ({ study: 'study', brush: 'brush', bath: 'bath', badminton: 'happy' })[anim] || 'happy'
}
