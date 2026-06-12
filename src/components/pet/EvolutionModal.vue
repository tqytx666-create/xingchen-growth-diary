<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { lockScroll } from '../../lib/scrollLock.js'
onMounted(() => lockScroll(true)); onUnmounted(() => lockScroll(false))   // 进化弹窗锁背景滚动
import { mainImage } from '../../lib/petImages.js'
import { ANIM, BLEND_VIDEO_OK } from '../../lib/petAnims.js'
const props = defineProps({ pet: Object, attrs: Object, stage: Object, hatch: Boolean })
const emit = defineEmits(['close'])
const src = computed(() => mainImage(props.pet, props.attrs))
// 孵化播"蛋裂开"视频,普通进化播进化视频
const playVideo = computed(() => props.hatch ? ANIM.hatch : ANIM.evolve)

const phase = ref('flash')   // flash → playing(视频) → reveal(揭晓新形态)
const bursts = ref([])
onMounted(() => {
  const EM = ['⭐', '✨', '🌟', '💫', '🩷', '⚡']
  for (let i = 0; i < 22; i++) {
    const ang = (Math.PI * 2 * i) / 22 + Math.random() * 0.25
    const dist = 92 + Math.random() * 78
    bursts.value.push({ id: i, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, d: Math.random() * 0.35, e: EM[i % EM.length], s: (0.8 + Math.random() * 0.9).toFixed(2) })
  }
  if (!BLEND_VIDEO_OK) {
    // 微信X5等不支持视频混合:白光闪后直接揭晓,不播黑底视频
    setTimeout(() => { phase.value = 'reveal' }, 650)
  } else {
    setTimeout(() => { phase.value = 'playing' }, 450)   // 白光闪后播视频
    setTimeout(() => { phase.value = 'reveal' }, 3600)   // 视频播 ~3s 后揭晓新形态
  }
})
</script>
<template>
  <div class="modal" @click.self="emit('close')">
    <div class="evo-flash" :class="{ gone: phase !== 'flash' }"></div>
    <div class="modal-card" :class="phase==='flash' ? 'flash' : 'reveal'">
      <h2 style="font-size:22px;color:#ffd86b;margin-bottom:8px">{{ hatch ? '🥚✨ 孵化!' : '✨ 进化!' }} {{ stage.name }}</h2>
      <div class="evo-dog-wrap">
        <div class="evo-ring"></div>
        <!-- 进化过程:播放发光进化视频 -->
        <video v-if="phase==='playing'" :src="playVideo" autoplay muted playsinline class="evo-video"></video>
        <!-- 揭晓:放射光芒 + 新形态静态图 + 星爆 -->
        <template v-else-if="phase==='reveal'">
          <div class="evo-rays"></div>
          <div class="evo-ring2"></div>
          <img :src="src" alt="星愿犬" class="evo-dog" />
          <span v-for="b in bursts" :key="b.id" class="evo-burst"
                :style="{ '--bx': b.x + 'px', '--by': b.y + 'px', '--bs': b.s, animationDelay: b.d + 's' }">{{ b.e }}</span>
        </template>
      </div>
      <p class="dim" style="font-size:14px;line-height:1.6;margin:6px 0 18px">
        <template v-if="hatch">初遇蛋孵化啦!{{ pet.name }} 出生成了 {{ stage.name }} 🐾 一切才刚刚开始,继续陪它长大吧。</template>
        <template v-else>{{ pet.name }} 进化成了 {{ stage.name }}!继续坚持,它会变得更强大。</template>
      </p>
      <button class="btn-accent" style="padding:12px 28px" @click="emit('close')">太棒了!</button>
    </div>
  </div>
</template>

<style scoped>
.evo-flash {
  position: fixed; inset: 0; background: radial-gradient(circle, #fff, rgba(255,255,255,.6) 40%, transparent 70%);
  z-index: 210; pointer-events: none; opacity: 1; transition: opacity .6s ease;
}
.evo-flash.gone { opacity: 0; }
.modal-card.flash { opacity: 0; }
.modal-card.reveal { animation: evoPop .5s cubic-bezier(.2,1.5,.4,1); }
@keyframes evoPop { 0%{transform:scale(.9);opacity:.4;} 60%{transform:scale(1.04);} 100%{transform:scale(1);opacity:1;} }
.evo-dog-wrap { position: relative; width: 180px; height: 180px; margin: 0 auto 14px; display: grid; place-items: center; }
/* 放射光芒(god-rays):缓慢旋转,边缘渐隐 */
.evo-rays { position: absolute; width: 320px; height: 320px; border-radius: 50%; z-index: 0; pointer-events: none;
  background: repeating-conic-gradient(from 0deg, rgba(255,216,107,.20) 0deg 7deg, transparent 7deg 19deg);
  -webkit-mask: radial-gradient(circle, #000 14%, rgba(0,0,0,.4) 44%, transparent 64%);
  mask: radial-gradient(circle, #000 14%, rgba(0,0,0,.4) 44%, transparent 64%);
  animation: raysSpin 9s linear infinite, raysIn .6s ease; }
@keyframes raysSpin { to { transform: rotate(360deg) } }
@keyframes raysIn { from { opacity: 0; transform: scale(.5) } to { opacity: 1 } }
/* 第二道扩散光环 */
.evo-ring2 { position: absolute; z-index: 1; width: 50px; height: 50px; border-radius: 50%;
  border: 2px solid rgba(139,233,255,.7); animation: evoRing2 1.2s .15s ease-out forwards; }
@keyframes evoRing2 { 0%{width:50px;height:50px;opacity:.8;} 100%{width:280px;height:280px;opacity:0;} }
.evo-video {
  width: 100%; height: 100%; object-fit: contain; mix-blend-mode: screen;
  -webkit-mask-image: radial-gradient(circle at 50% 48%, #000 60%, rgba(0,0,0,.6) 74%, transparent 86%);
  mask-image: radial-gradient(circle at 50% 48%, #000 60%, rgba(0,0,0,.6) 74%, transparent 86%);
}
.evo-dog { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: contain;
  filter: drop-shadow(0 0 22px rgba(255,216,107,.75)); animation: evoReveal .6s ease, dogGlow 2.2s ease-in-out infinite .6s; }
@keyframes dogGlow { 0%,100%{ filter: drop-shadow(0 0 18px rgba(255,216,107,.6)) } 50%{ filter: drop-shadow(0 0 30px rgba(255,216,107,.95)) } }
@keyframes evoReveal { 0%{transform:scale(.4) rotate(-10deg);opacity:0;} 100%{transform:scale(1) rotate(0);opacity:1;} }
.evo-ring {
  position: absolute; width: 60px; height: 60px; border-radius: 50%;
  border: 3px solid rgba(255,216,107,.8); animation: evoRing 1s ease-out forwards;
}
@keyframes evoRing { 0%{width:40px;height:40px;opacity:.9;} 100%{width:230px;height:230px;opacity:0;} }
.evo-burst { position: absolute; z-index: 3; font-size: 22px; animation: evoBurst 1.15s ease-out forwards; }
@keyframes evoBurst {
  0%{transform:translate(0,0) scale(.3);opacity:0;}
  22%{opacity:1;}
  100%{transform:translate(var(--bx),var(--by)) scale(var(--bs,1.1));opacity:0;}
}
</style>
