<script setup>
// 数字增长跳动:值变化时从旧值平滑滚到新值,变大时弹一下(增强"赚到了"的爽感)
import { ref, watch, onMounted } from 'vue'
const props = defineProps({
  value: { type: Number, default: 0 },
  dur: { type: Number, default: 650 }
})
const shown = ref(props.value)
const pop = ref(false)
let raf = null
function tween(to, from) {
  cancelAnimationFrame(raf)
  const f = Number(from) || 0
  const delta = to - f
  if (delta === 0) { shown.value = to; return }
  if (delta > 0) { pop.value = false; requestAnimationFrame(() => { pop.value = true }); setTimeout(() => (pop.value = false), 480) }
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / props.dur)
    const e = 1 - Math.pow(1 - t, 3)   // easeOutCubic
    shown.value = Math.round(f + delta * e)
    if (t < 1) raf = requestAnimationFrame(step)
    else shown.value = to
  }
  raf = requestAnimationFrame(step)
}
watch(() => props.value, (to, from) => tween(to, from))
onMounted(() => { shown.value = props.value })
</script>

<template><span class="countup" :class="{ pop }">{{ shown }}</span></template>

<style scoped>
.countup { display: inline-block; }
.countup.pop { animation: cpop .48s cubic-bezier(.2, 1.5, .4, 1); }
@keyframes cpop { 0% { transform: scale(1) } 40% { transform: scale(1.38) } 100% { transform: scale(1) } }
@media (prefers-reduced-motion: reduce) { .countup.pop { animation: none } }
</style>
