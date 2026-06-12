// 弹窗背景滚动锁(计数式,支持多层弹窗叠加):开弹窗 lock(true),关弹窗 lock(false)。
// 用 watch(isOpen, v => lockScroll(v)) 接入;组件卸载前记得解锁(或用 watchEffect + onUnmounted)。
let count = 0
export function lockScroll(on) {
  count = Math.max(0, count + (on ? 1 : -1))
  document.body.style.overflow = count > 0 ? 'hidden' : ''
}
