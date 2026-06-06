// 即梦生成的动作视频(纯黑背景,用 mix-blend-mode:screen 融入深色舞台)
import idle from '../assets/anim/anim_idle.mp4'
import brush from '../assets/anim/anim_brush.mp4'
import bath from '../assets/anim/anim_bath.mp4'
import study from '../assets/anim/anim_study.mp4'
import badminton from '../assets/anim/anim_badminton.mp4'
import evolve from '../assets/anim/anim_evolve.mp4'
import hatch from '../assets/anim/anim_hatch.mp4'
import boxSilver from '../assets/anim/anim_box_silver.mp4'
import boxGold from '../assets/anim/anim_box_gold.mp4'
import god from '../assets/anim/anim_god.mp4'
import happy from '../assets/anim/anim_happy.mp4'
import skinBowVid from '../assets/anim/anim_skin_bow.mp4'
import skinWingsVid from '../assets/anim/anim_skin_wings.mp4'
import skinUnicornVid from '../assets/anim/anim_skin_unicorn.mp4'
import skinHanfuVid from '../assets/anim/anim_skin_hanfu.mp4'

export const ANIM = { idle, brush, bath, study, badminton, evolve, hatch, god, happy }
// 宝箱开箱视频(按档次)
export const BOX_ANIM = { silver: boxSilver, gold: boxGold }
// 各阶段待机视频(stage_idx → 视频);没列的阶段用静态图+CSS。
// 1幼犬/2星纹→基础摇尾;6神犬→漂浮;3翼星/4辉光/5御星 用静态形态图+CSS动效。
export const STAGE_IDLE = { 1: idle, 2: idle, 6: god }
// 会动的皮肤:装扮这些皮肤时播放专属待机视频(没列的皮肤显示静态皮肤图)
export const SKIN_IDLE = { bow: skinBowVid, wings: skinWingsVid, unicorn: skinUnicornVid, hanfu: skinHanfuVid }

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
