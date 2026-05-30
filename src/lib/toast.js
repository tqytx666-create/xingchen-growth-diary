import { reactive } from 'vue'
export const toastState = reactive({ msg: '', show: false })
let t = null
export function toast(msg) {
  toastState.msg = msg; toastState.show = true
  clearTimeout(t); t = setTimeout(() => { toastState.show = false }, 2200)
}
