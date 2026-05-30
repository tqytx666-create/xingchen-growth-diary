<script setup>
import { computed, ref, onMounted } from 'vue'
import { mainImage } from '../../lib/petImages.js'
import { ANIM } from '../../lib/petAnims.js'
const props = defineProps({ pet: Object, attrs: Object, stage: Object })
const emit = defineEmits(['close'])
const src = computed(() => mainImage(props.pet, props.attrs))
const evolveVideo = ANIM.evolve

const phase = ref('flash')   // flash → playing(进化视频) → reveal(揭晓新形态)
const bursts = ref([])
onMounted(() => {
  for (let i = 0; i < 14; i++) {
    const ang = (Math.PI * 2 * i) / 14
    const dist = 80 + Math.random() * 50
    bursts.value.push({ id: i, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, d: Math.random() * 0.2, e: ['⭐', '✨', '🌟'][i % 3] })
  }
  setTimeout(() => { phase.value = 'playing' }, 450)   // 白光闪后播视频
  setTimeout(() => { phase.value = 'reveal' }, 3600)   // 视频播 ~3s 后揭晓新形态
})
</script>
<template>
  <div class="modal" @click.self="emit('close')">
    <div class="evo-flash" :class="{ gone: phase !== 'flash' }"></div>
    <div class="modal-card" :class="phase==='flash' ? 'flash' : 'reveal'">
      <h2 style="font-size:22px;color:#ffd86b;margin-bottom:8px">✨ 进化! {{ stage.name }}</h2>
      <div class="evo-dog-wrap">
        <div class="evo-ring"></div>
        <!-- 进化过程:播放发光进化视频 -->
        <video v-if="phase==='playing'" :src="evolveVideo" autoplay muted playsinline class="evo-video"></video>
        <!-- 揭晓:新形态静态图 + 星爆 -->
        <template v-else-if="phase==='reveal'">
          <img :src="src" alt="星愿犬" class="evo-dog" />
          <span v-for="b in bursts" :key="b.id" class="evo-burst"
                :style="{ '--bx': b.x + 'px', '--by': b.y + 'px', animationDelay: b.d + 's' }">{{ b.e }}</span>
        </template>
      </div>
      <p class="dim" style="font-size:14px;line-height:1.6;margin:6px 0 18px">
        {{ pet.name }} 进化成了 {{ stage.name }}!继续坚持,它会变得更强大。
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
.evo-video { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: screen; }
.evo-dog { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 22px rgba(255,216,107,.75)); animation: evoReveal .6s ease; }
@keyframes evoReveal { 0%{transform:scale(.4) rotate(-10deg);opacity:0;} 100%{transform:scale(1) rotate(0);opacity:1;} }
.evo-ring {
  position: absolute; width: 60px; height: 60px; border-radius: 50%;
  border: 3px solid rgba(255,216,107,.8); animation: evoRing 1s ease-out forwards;
}
@keyframes evoRing { 0%{width:40px;height:40px;opacity:.9;} 100%{width:230px;height:230px;opacity:0;} }
.evo-burst { position: absolute; font-size: 20px; animation: evoBurst 1s ease-out forwards; }
@keyframes evoBurst {
  0%{transform:translate(0,0) scale(.3);opacity:0;}
  25%{opacity:1;}
  100%{transform:translate(var(--bx),var(--by)) scale(1.1);opacity:0;}
}
</style>
