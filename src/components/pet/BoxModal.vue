<script setup>
import { ref, computed, onMounted } from 'vue'
import boxSilver from '../../assets/box/box_silver.png'
import boxGold from '../../assets/box/box_gold.png'
import boxDiamond from '../../assets/box/box_diamond.png'
import { BOX_ANIM, BLEND_VIDEO_OK } from '../../lib/petAnims.js'
import CoinIcon from '../CoinIcon.vue'

const props = defineProps({
  tier: { type: String, default: 'silver' },   // silver / gold / diamond
  minutes: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  taskName: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const IMG = { silver: boxSilver, gold: boxGold, diamond: boxDiamond }
const META = {
  silver:  { name: '银宝箱',   emoji: '🥈', glow: '#d8e0ec' },
  gold:    { name: '金宝箱',   emoji: '🥇', glow: '#ffd86b' },
  diamond: { name: '钻石宝箱', emoji: '💎', glow: '#8be9ff' }
}
const meta = computed(() => META[props.tier] || META.silver)
const img = computed(() => IMG[props.tier] || IMG.silver)
// 有开箱视频且环境支持 → 播视频;否则回落 CSS 开箱(微信X5等)
const video = computed(() => BLEND_VIDEO_OK ? (BOX_ANIM[props.tier] || null) : null)

const opened = ref(false)   // 是否已开盖揭晓奖励
onMounted(() => {
  // 视频:开盖光爆约 ~2.2s 后揭晓;CSS:抖动 ~1.1s 后开
  setTimeout(() => { opened.value = true }, video.value ? 2200 : 1100)
})
function done() { if (opened.value) emit('close') }
</script>

<template>
  <div class="box-overlay" @click="done">
    <div class="box-stage" :style="{ '--glow': meta.glow }">
      <div class="box-title">{{ meta.emoji }} {{ meta.name }}</div>

      <!-- 视频开箱 -->
      <div v-if="video" class="box-wrap">
        <video :src="video" autoplay muted playsinline class="box-video blend"></video>
      </div>
      <!-- CSS 回落开箱 -->
      <div v-else class="box-wrap" :class="opened ? 'is-open' : 'is-shake'">
        <div class="box-halo"></div>
        <img :src="img" :alt="meta.name" class="box-img" draggable="false" />
      </div>

      <transition name="reveal">
        <div v-if="opened" class="box-reward">
          <div class="prize-list">
            <div class="prize-row">
              <span class="prize-ic">⏱️</span>
              <span class="prize-val">+{{ minutes }}</span>
              <span class="prize-unit">分钟<br>游戏时间</span>
            </div>
            <div v-if="coins" class="prize-row coin">
              <span class="prize-ic"><CoinIcon /></span>
              <span class="prize-val">+{{ coins }}</span>
              <span class="prize-unit">星币<br>去商城买</span>
            </div>
          </div>
          <div class="box-sub">游戏时间已存银行{{ coins ? ',星币已到账,可去🛍️商城花' : '' }}</div>
          <div class="box-tap">轻触关闭</div>
        </div>
      </transition>
      <div v-if="!opened" class="box-hint">{{ taskName }} · 开箱中…</div>
    </div>
  </div>
</template>

<style scoped>
.box-overlay{position:fixed;inset:0;z-index:80;display:grid;place-items:center;
  background:radial-gradient(60% 50% at 50% 45%, rgba(20,16,40,.78), rgba(6,4,16,.94));
  backdrop-filter:blur(3px);animation:fadein .25s ease}
.box-stage{text-align:center;padding:24px;max-width:340px}
.box-title{font-size:15px;font-weight:700;color:#fff;letter-spacing:.5px;margin-bottom:14px;
  text-shadow:0 0 12px var(--glow)}
.box-wrap{position:relative;width:230px;height:230px;margin:0 auto;display:grid;place-items:center}
.box-video{width:100%;height:100%;object-fit:contain}
.box-img{width:170px;height:170px;object-fit:contain;position:relative;z-index:2;
  filter:drop-shadow(0 8px 18px rgba(0,0,0,.5))}
.box-halo{position:absolute;inset:-10%;border-radius:50%;z-index:1;
  background:radial-gradient(circle, var(--glow) 0%, transparent 62%);opacity:0;transition:opacity .4s}
.is-shake .box-img{animation:boxshake .55s ease-in-out infinite}
.is-open .box-halo{opacity:.85;animation:halopulse 1.6s ease-out infinite}
.is-open .box-img{animation:boxpop .6s cubic-bezier(.2,1.4,.4,1) forwards}
.blend{mix-blend-mode:screen;
  -webkit-mask-image:radial-gradient(circle at 50% 50%, #000 62%, rgba(0,0,0,.6) 76%, transparent 88%);
  mask-image:radial-gradient(circle at 50% 50%, #000 62%, rgba(0,0,0,.6) 76%, transparent 88%)}
.box-reward{margin-top:12px}
.prize-list{display:flex;justify-content:center;gap:12px}
.prize-row{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 16px;border-radius:16px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);min-width:96px}
.prize-row.coin{background:rgba(255,216,107,.12);border-color:rgba(255,216,107,.35)}
.prize-ic{font-size:26px;line-height:1}
.prize-val{font-size:28px;font-weight:800;color:#fff;text-shadow:0 0 14px var(--glow);line-height:1.1}
.prize-row.coin .prize-val{color:#ffd86b;text-shadow:0 0 14px rgba(255,216,107,.6)}
.prize-unit{font-size:11px;color:rgba(255,255,255,.65);line-height:1.25}
.box-sub{font-size:12px;color:rgba(255,255,255,.7);margin-top:10px}
.box-tap{font-size:11px;color:rgba(255,255,255,.45);margin-top:14px}
.box-hint{font-size:12px;color:rgba(255,255,255,.6);margin-top:12px}
@keyframes boxshake{0%,100%{transform:translateX(0) rotate(0)}
  20%{transform:translateX(-5px) rotate(-4deg)}40%{transform:translateX(5px) rotate(4deg)}
  60%{transform:translateX(-4px) rotate(-3deg)}80%{transform:translateX(4px) rotate(3deg)}}
@keyframes boxpop{0%{transform:scale(.9)}40%{transform:scale(1.18) translateY(-6px)}
  100%{transform:scale(1.05) translateY(0)}}
@keyframes halopulse{0%{transform:scale(.85);opacity:.85}100%{transform:scale(1.25);opacity:.25}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.reveal-enter-active{transition:all .5s cubic-bezier(.2,1.3,.4,1)}
.reveal-enter-from{opacity:0;transform:translateY(14px) scale(.8)}
</style>
