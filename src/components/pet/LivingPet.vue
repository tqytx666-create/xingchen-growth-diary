<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  set: { type: Object, required: true },   // { idle, brush, study, bath, eat, happy, ... }
  action: { type: String, default: '' }     // 触发播放的动作 key('' = 仅待机)
})
const emit = defineEmits(['done', 'tap'])

const actEl = ref(null)
const showAct = ref(false)
const idleReady = ref(false)

// 预热动作视频(最常用 happy 优先):提前进 HTTP 缓存,点击秒播不等下载
const warmed = new Set()
function warm(set) {
  if (!set) return
  for (const k of ['happy', 'study', 'brush', 'bath']) {
    const url = set[k]
    if (url && !warmed.has(url)) { warmed.add(url); fetch(url).catch(() => {}) }
  }
}
onMounted(() => warm(props.set))
// 换皮肤/形态:底层视频先淡出再淡入(避免黑屏硬切),同时预热新动作
watch(() => props.set, (s) => { idleReady.value = false; warm(s) })

// 切到某动作:换源 → 播放 → 淡入;播完淡回待机
watch(() => props.action, (a) => {
  if (a && props.set[a] && actEl.value) {
    const v = actEl.value
    v.src = props.set[a]
    try { v.currentTime = 0 } catch (e) { /* ignore */ }
    const pr = v.play(); if (pr && pr.catch) pr.catch(() => {})
    showAct.value = true
  }
})
function onEnded() { showAct.value = false; emit('done') }
</script>

<template>
  <div class="living-stage" @click="emit('tap')">
    <!-- 底层:溜达待机循环(loadeddata 后淡入,换装不黑闪) -->
    <video :src="set.idle" autoplay loop muted playsinline class="lv-video lv-idle" :class="{ ready: idleReady }"
      @loadeddata="idleReady = true"></video>
    <!-- 顶层:动作视频,淡入淡出交叉切换 -->
    <video ref="actEl" muted playsinline class="lv-video lv-act" :class="{ show: showAct }" @ended="onEnded"></video>
  </div>
</template>

<style scoped>
.living-stage { position: relative; width: 100%; aspect-ratio: 3/2; border-radius: 18px; overflow: hidden;
  background: #0a0814; cursor: pointer; margin-top: 6px;
  transition: transform .14s ease; -webkit-tap-highlight-color: transparent; }
.living-stage:active { transform: scale(.982); }   /* 摸宠物的按压手感 */
.lv-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.lv-idle { opacity: 0; transition: opacity .45s ease; }
.lv-idle.ready { opacity: 1; }
.lv-act { opacity: 0; transition: opacity .35s ease; }
.lv-act.show { opacity: 1; }
</style>
