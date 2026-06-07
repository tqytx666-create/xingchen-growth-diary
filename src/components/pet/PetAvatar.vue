<script setup>
import { computed } from 'vue'
import { mainImage } from '../../lib/petImages.js'
import { ANIM, BLEND_VIDEO_OK, STAGE_IDLE, SKIN_IDLE } from '../../lib/petAnims.js'
import { isLow, sizeForLevel, animClassForLevel, HEALTH_SICK } from '../../lib/petConfig.js'

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

const stageIdx = computed(() => props.pet.stage_idx || 0)
// 生病:已孵化 + 健康 ≤ 生病线 → 病恹恹(回落静态图 + 滤镜 + 🤒)
const sick = computed(() => stageIdx.value >= 1 && props.pet.health != null && props.pet.health <= HEALTH_SICK)
// 蛋阶段(stage 0)只显示静态蛋图,不放任何视频
const hatched = computed(() => stageIdx.value >= 1)
// 待机视频:① 装扮了"会动的皮肤"→播皮肤专属待机;② 默认皮肤→按阶段(幼犬/成长摇尾、神犬漂浮)。
// 蛋阶段、微信X5、低落/退阶风险一律回落静态图。
const idleSrc = computed(() => {
  if (!props.useVideo || !BLEND_VIDEO_OK || isLow(props.pet) || props.pet.risk >= 2 || sick.value) return null
  if (stageIdx.value <= 0) return null
  const skin = props.pet.skin
  if (skin && skin !== 'default') return SKIN_IDLE[skin] || null
  return STAGE_IDLE[stageIdx.value] || null
})
// 静态形态图的 CSS 待机动效(幼犬抖动/成长蹦跳/进阶呼吸/精英摆动/神犬漂浮发光),仅在不播待机视频时启用
const animClass = computed(() => (hatched.value && !idleSrc.value && !isLow(props.pet) && props.pet.risk < 2 && !sick.value) ? animClassForLevel(props.pet.level) : '')
// 顶层动作视频(叠加,不替换底层 → 无重建闪烁);蛋阶段/不支持的环境关闭,避免黑框
const actionSrc = computed(() => (hatched.value && BLEND_VIDEO_OK && props.actionAnim && ANIM[props.actionAnim]) ? ANIM[props.actionAnim] : null)

const stateClass = computed(() => {
  if (sick.value) return 'sick'
  if (props.pet.risk >= 2) return 'risk'
  if (isLow(props.pet)) return 'low'
  if (props.happy) return 'happy'
  return ''
})
</script>

<template>
  <div class="dog" :class="[stateClass, animClass]" :style="{ width: px + 'px', height: px + 'px' }"
       @click="interactive && emit('pet')">
    <!-- 底层:待机视频 或 静态图(常驻,不随动作切换重建) -->
    <video v-if="idleSrc" :key="idleSrc" :src="idleSrc" autoplay loop muted playsinline class="dog-media blend"></video>
    <img v-else :src="img" alt="星愿犬" draggable="false" class="dog-media" />

    <!-- 顶层:动作视频,淡入叠加在待机之上,结束淡出 -->
    <transition name="fade">
      <video v-if="actionSrc" :key="actionSrc" :src="actionSrc" autoplay muted playsinline
             class="dog-media blend action-layer"></video>
    </transition>

    <!-- 生病标记 -->
    <span v-if="sick" class="sick-badge">🤒</span>
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
/* 状态不佳(低落 / 退阶风险):不换图,直接给原图加灰色蒙板 */
.dog.low .dog-media,
.dog.risk .dog-media { filter: grayscale(1) brightness(.7); transition: filter .4s ease; }
/* 生病:病恹恹的青灰滤镜 */
.dog.sick .dog-media { filter: grayscale(.75) brightness(.78) hue-rotate(55deg); transition: filter .4s ease; }
.sick-badge { position: absolute; top: 6%; right: 10%; font-size: 26px; z-index: 3;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); animation: sickWobble 1.6s ease-in-out infinite; }
@keyframes sickWobble { 0%,100% { transform: rotate(-8deg) } 50% { transform: rotate(8deg) } }
/* 动作层淡入淡出,避免硬切黑闪 */
.fade-enter-active, .fade-leave-active { transition: opacity .35s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
