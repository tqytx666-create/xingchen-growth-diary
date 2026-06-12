import { reactive } from 'vue'
// 可叠放 toast 队列:连发提示(打卡→升级→礼包→晋级)逐条叠着显示,不再互相顶掉。
// 最多同屏 3 条,超出顶掉最旧;每条自己计时,长文案多停留一会儿。
export const toastState = reactive({ list: [] })
let seq = 0
export function toast(msg) {
  const id = ++seq
  toastState.list.push({ id, msg })
  if (toastState.list.length > 3) toastState.list.shift()
  const ttl = Math.min(4200, 2200 + Math.max(0, msg.length - 12) * 55)
  setTimeout(() => {
    const i = toastState.list.findIndex(x => x.id === id)
    if (i !== -1) toastState.list.splice(i, 1)
  }, ttl)
}
