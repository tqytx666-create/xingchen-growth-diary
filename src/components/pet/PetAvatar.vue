<script setup>
import { computed } from 'vue'
import { mainImage } from '../../lib/petImages.js'
import { ANIM, BLEND_VIDEO_OK } from '../../lib/petAnims.js'
import { isLow, sizeForLevel } from '../../lib/petConfig.js'

const props = defineProps({
  pet: { type: Object, required: true },
  attrs: { type: Object, required: true },
  size: { type: Number, default: 0 },
  happy: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true },
  useVideo: { type: Boolean, default: true },
  actionAnim: { type: String, default: '' }
})
const emit = defineEmits(['pet'])

const img = computed(() => mainImage(props.pet, props.attrs))
const px = computed(() => props.size || sizeForLevel(props.pet.level || 1))

const skinDefault = computed(() => !props.pet.skin || props.pet.skin === 'default')
// 底层待机:默认皮肤 + 正常状态才用视频;微信X5/不支持混合模式的环境回落静态图
const idleVideo = computed(() => props.useVideo && BLEND_VIDEO_OK && skinDefault.value && !isLow(props.pet) && props.pet.risk < 2)
// 顶层动作视频(叠加,不替换底层 → 无重建闪烁);同样在不支持的环境关闭,避免黑框
const actionSrc = computed(() => (BLEND_VIDEO_OK && props.actionAnim && ANIM[props.actionAnim]) ? ANIM[props.actionAnim] : null)

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
    <!-- 底层:待机视频 或 静态图(常驻,不随动作切换重建) -->
    <video v-if="idleVideo" :src="ANIM.idle" autoplay loop muted playsinline class="dog-media blend"></video>
    <img v-else :src="img" alt="星愿犬" draggable="false" class="dog-media" />

    <!-- 顶层:动作视频,淡入叠加在待机之上,结束淡出 -->
    <transition name="fade">
      <video v-if="actionSrc" :key="actionSrc" :src="actionSrc" autoplay muted playsinline
             class="dog-media blend action-layer"></video>
    </transition>
  </div>
</template>

<style scoped>
.dog { position: relative; }
.dog-media {
  position: absolute; inset: 0;
  width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none;
}
/* 静态图也绝对定位时需要尺寸 */
img.dog-media { position: absolute; }
/* screen 滤黑底 + 径向遮罩把方形边缘渐隐,消除"正方形框" */
.blend {
  mix-blend-mode: screen;
  -webkit-mask-image: radial-gradient(circle at 50% 48%, #000 60%, rgba(0,0,0,.6) 74%, transparent 86%);
  mask-image: radial-gradient(circle at 50% 48%, #000 60%, rgba(0,0,0,.6) 74%, transparent 86%);
}
.action-layer { z-index: 2; }
/* 动作层淡入淡出,避免硬切黑闪 */
.fade-enter-active, .fade-leave-active { transition: opacity .35s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
