<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  set: { type: Object, required: true },   // { idle, brush, study, bath, eat, happy, ... }
  action: { type: String, default: '' }     // 触发播放的动作 key('' = 仅待机)
})
const emit = defineEmits(['done', 'tap'])

const actEl = ref(null)
const showAct = ref(false)

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
    <!-- 底层:溜达待机循环 -->
    <video :src="set.idle" autoplay loop muted playsinline class="lv-video"></video>
    <!-- 顶层:动作视频,淡入淡出交叉切换 -->
    <video ref="actEl" muted playsinline class="lv-video lv-act" :class="{ show: showAct }" @ended="onEnded"></video>
  </div>
</template>

<style scoped>
.living-stage { position: relative; width: 100%; aspect-ratio: 3/2; border-radius: 18px; overflow: hidden;
  background: #0a0814; cursor: pointer; margin-top: 6px; }
.lv-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.lv-act { opacity: 0; transition: opacity .35s ease; }
.lv-act.show { opacity: 1; }
</style>
