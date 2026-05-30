<script setup>
import { computed, ref, watch } from 'vue'
import { mainImage } from '../../lib/petImages.js'
import { ANIM } from '../../lib/petAnims.js'
import { isLow, sizeForLevel } from '../../lib/petConfig.js'

const props = defineProps({
  pet: { type: Object, required: true },
  attrs: { type: Object, required: true },
  size: { type: Number, default: 0 },          // 0 = 按等级自动
  happy: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true },
  useVideo: { type: Boolean, default: true },   // 主页用视频,图鉴/小图用静态
  actionAnim: { type: String, default: '' }      // 临时播放的动作:study/brush/bath/badminton/evolve
})
const emit = defineEmits(['pet'])

const img = computed(() => mainImage(props.pet, props.attrs))
const px = computed(() => props.size || sizeForLevel(props.pet.level || 1))

// 是否用视频:皮肤/形态用静态图(视频只有默认款),只有默认皮肤+无装备形态时用待机视频
const skinDefault = computed(() => !props.pet.skin || props.pet.skin === 'default')
const idleVideo = computed(() => props.useVideo && skinDefault.value && !isLow(props.pet) && props.pet.risk < 2)

// 当前视频源:优先动作,否则待机
const videoSrc = computed(() => {
  if (props.actionAnim && ANIM[props.actionAnim]) return ANIM[props.actionAnim]
  if (idleVideo.value) return ANIM.idle
  return null
})

const stateClass = computed(() => {
  if (props.pet.risk >= 2) return 'risk'
  if (isLow(props.pet)) return 'low'
  if (props.happy) return 'happy'
  return ''
})
</script>

<template>
  <div class="dog" :class="stateClass" :style="{ width: px + 'px', height: px + 'px' }"
       @click="interactive && emit('pet')">
    <video v-if="videoSrc" :src="videoSrc" autoplay loop muted playsinline class="dog-video" :key="videoSrc"></video>
    <img v-else :src="img" alt="星愿犬" draggable="false" />
  </div>
</template>

<style scoped>
.dog-video { width: 100%; height: 100%; object-fit: contain; display: block; mix-blend-mode: screen; pointer-events: none; }
</style>
