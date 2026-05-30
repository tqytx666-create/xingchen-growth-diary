// 即梦生成的动作视频(纯黑背景,用 mix-blend-mode:screen 融入深色舞台)
import idle from '../assets/anim/anim_idle.mp4'
import brush from '../assets/anim/anim_brush.mp4'
import bath from '../assets/anim/anim_bath.mp4'
import study from '../assets/anim/anim_study.mp4'
import badminton from '../assets/anim/anim_badminton.mp4'
import evolve from '../assets/anim/anim_evolve.mp4'

export const ANIM = { idle, brush, bath, study, badminton, evolve }

// 任务动画类型 → 视频
export const TASK_ANIM = { study, brush, bath, badminton }
export function taskAnimVideo(kind) { return TASK_ANIM[kind] || null }
