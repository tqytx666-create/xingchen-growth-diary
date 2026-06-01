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

// 能否用"视频 + mix-blend-mode:screen"这套待机/动作特技?
// 微信/QQ 安卓内置 X5(TBS)内核:<video> 默认被劫持成全屏原生播放器、不内联自动播,
// 且老内核不支持 mix-blend-mode / CSS mask → 宠物那块要么空白要么黑框。
// 这些环境一律回落到静态透明 PNG(rembg 抠好的图,本就不需要混合特技)。
export const BLEND_VIDEO_OK = (() => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/MicroMessenger|QQ\/|QQBrowser|MQQBrowser/i.test(ua)) return false
  try {
    if (window.CSS && CSS.supports && !CSS.supports('mix-blend-mode', 'screen')) return false
  } catch (e) { /* 不支持 CSS.supports 的老环境也回落 */ return false }
  return true
})()
