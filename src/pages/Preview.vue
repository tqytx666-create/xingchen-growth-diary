<script setup>
// 效果预览页(免登录,纯展示,不读写真实数据)——南哥用来安全地一个个看效果
import { ref, nextTick } from 'vue'
import { SKIN_TRACK, ROOM_TRACK } from '../lib/petImages.js'
import { STAGES } from '../lib/petConfig.js'
import BoxModal from '../components/pet/BoxModal.vue'
import EvolutionModal from '../components/pet/EvolutionModal.vue'
import CountUp from '../components/CountUp.vue'

// —— 弹窗演示 ——
const boxDemo = ref(null)
function showBox(tier) { boxDemo.value = { tier, minutes: tier === 'diamond' ? 10 : 4, coins: tier === 'diamond' ? 32 : 15 } }
const evoDemo = ref(null)
const fakePet = { name: '小愿', species: '星愿犬', stage_idx: 3, level: 5, skin: 'default', mood: 'happy', risk: 0 }
function showEvo() { evoDemo.value = STAGES[3] }

// —— 打卡彩屑 ——
function celebrate() {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden'
  const E = ['⭐', '✨', '🌟', '💫', '🎉', '🩷', '🐾']
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('div')
    s.textContent = E[i % E.length]
    s.style.cssText = `position:absolute;left:${Math.random() * 100}vw;top:-32px;font-size:${15 + Math.random() * 16}px;transition:transform 1.15s cubic-bezier(.2,.6,.3,1),opacity 1.15s ease-in;opacity:1`
    wrap.appendChild(s)
    requestAnimationFrame(() => { s.style.transform = `translateY(${72 + Math.random() * 26}vh) rotate(${Math.random() * 540 - 270}deg)`; s.style.opacity = '0' })
  }
  document.body.appendChild(wrap); setTimeout(() => wrap.remove(), 1350)
}

// —— 数字跳动 ——
const coinDemo = ref(20)
function addCoins() { coinDemo.value += 5 + Math.floor(Math.random() * 16) }

// —— 时间银行:利息「手动收集」动效 ——
const balance = ref(126)
const interest = ref(8)
const balRef = ref(null)
const collecting = ref(false)
const balBump = ref(false)
// 利息收集:一群发光小星星喷出 → 拖尾绕一圈 → 俯冲汇入余额 → 余额数字向上推动(魔法棒粒子感)
function collectInterest(ev) {
  if (interest.value <= 0 || collecting.value) return
  collecting.value = true
  const amt = interest.value
  const btn = ev.currentTarget.getBoundingClientRect()
  const tgt = balRef.value.getBoundingClientRect()
  const sx = btn.left + btn.width / 2, sy = btn.top + btn.height / 2
  const tx = tgt.left + tgt.width / 2, ty = tgt.top + tgt.height / 2
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4   // 绕圈中心
  const layer = document.createElement('div')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:90'
  const ICON = ['⭐', '✨', '🌟', '💫', '⏱️']
  const N = 26
  for (let i = 0; i < N; i++) {
    const s = document.createElement('div')
    s.textContent = ICON[i % ICON.length]
    s.style.cssText = `position:fixed;left:${sx}px;top:${sy}px;font-size:${12 + Math.random() * 14}px;
      transform:translate(-50%,-50%);opacity:0;will-change:transform,opacity;
      filter:drop-shadow(0 0 6px rgba(255,216,107,.95)) drop-shadow(0 0 12px rgba(255,201,64,.6))`
    layer.appendChild(s)
    const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5
    const R = 120 + Math.random() * 95
    const mx = cx + Math.cos(ang) * R, my = cy + Math.sin(ang) * R           // 喷散到外圈
    const a2 = ang + 1.5, R2 = R * 0.66
    const wx = cx + Math.cos(a2) * R2, wy = cy + Math.sin(a2) * R2           // 绕行一段
    s.animate([
      { transform: 'translate(-50%,-50%) translate(0px,0px) scale(.4) rotate(0deg)', opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.12 },
      { transform: `translate(-50%,-50%) translate(${mx - sx}px,${my - sy}px) scale(1.3) rotate(170deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(-50%,-50%) translate(${wx - sx}px,${wy - sy}px) scale(1) rotate(310deg)`, opacity: 1, offset: 0.66 },
      { transform: `translate(-50%,-50%) translate(${tx - sx}px,${ty - sy}px) scale(.22) rotate(540deg)`, opacity: 0, offset: 1 }
    ], { duration: 1300 + Math.random() * 250, delay: i * 22, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' })
  }
  document.body.appendChild(layer)
  setTimeout(() => { balance.value += amt; balBump.value = true; setTimeout(() => (balBump.value = false), 430) }, 1080) // 星星汇入时余额向上推动
  setTimeout(() => { layer.remove() }, 1800)
  setTimeout(() => { interest.value = 0; collecting.value = false }, 1150)
  setTimeout(() => { interest.value = 8 }, 3800)     // demo:过会儿又攒出利息,可反复点
}

// —— 皮肤大图 ——
const bigImg = ref(null)
</script>

<template>
  <div class="pv">
    <h1>✨ 效果预览 <span class="pv-sub">开发预览 · 不影响小鱼的真实数据,随便点</span></h1>

    <!-- 动效演示 -->
    <section>
      <h2>🎬 动效演示(点按钮看)</h2>
      <div class="pv-btns">
        <button @click="showBox('gold')">🎁 开箱(金)</button>
        <button @click="showBox('diamond')">💎 开箱(钻石)</button>
        <button @click="showEvo">🌟 进化揭晓</button>
        <button @click="celebrate">🎉 打卡彩屑</button>
      </div>
    </section>

    <!-- 数字跳动 -->
    <section>
      <h2>🔢 数字跳动</h2>
      <div class="pv-row">
        <span class="pv-chip">🪙 <CountUp :value="coinDemo" /></span>
        <button @click="addCoins">+ 赚星币</button>
      </div>
    </section>

    <!-- 时间银行:利息手动收集 -->
    <section>
      <h2>⏱️ 时间银行 · 利息手动收集</h2>
      <div class="bank-card">
        <div class="bank-label">游戏时间余额</div>
        <div class="bank-bal" :class="{ bump: balBump }" ref="balRef"><CountUp :value="balance" :dur="800" /><span class="bank-unit">分钟</span></div>
        <button class="bank-collect" :class="{ off: interest <= 0 }" @click="collectInterest">
          <template v-if="interest > 0">✨ 收取利息 +{{ interest }} 分钟</template>
          <template v-else>已收取 · 利息攒着中…</template>
        </button>
        <div class="bank-tip">利息会随时间慢慢攒出来,点一下,时间星星就飞进余额里 🌟</div>
      </div>
    </section>

    <!-- 皮肤画廊 -->
    <section>
      <h2>🎨 皮肤 ({{ SKIN_TRACK.length }})</h2>
      <div class="pv-grid">
        <div v-for="s in SKIN_TRACK" :key="s.key" class="pv-cell" @click="bigImg = { img: s.img, name: s.emoji + ' ' + s.name }">
          <div class="pv-pic"><img :src="s.img" :alt="s.name" /></div>
          <div class="pv-nm">{{ s.emoji }} {{ s.name }}</div>
        </div>
      </div>
    </section>

    <!-- 房间画廊 -->
    <section>
      <h2>🏠 房间 ({{ ROOM_TRACK.length }})</h2>
      <div class="pv-grid rooms">
        <div v-for="r in ROOM_TRACK" :key="r.key" class="pv-cell" @click="bigImg = { img: r.img, name: r.emoji + ' ' + r.name }">
          <div class="pv-room"><img :src="r.img" :alt="r.name" /></div>
          <div class="pv-nm">{{ r.emoji }} {{ r.name }}</div>
        </div>
      </div>
    </section>

    <!-- 弹窗们 -->
    <BoxModal v-if="boxDemo" :tier="boxDemo.tier" :minutes="boxDemo.minutes" :coins="boxDemo.coins" task-name="演示" @close="boxDemo = null" />
    <EvolutionModal v-if="evoDemo" :pet="fakePet" :attrs="{}" :stage="evoDemo" :hatch="false" @close="evoDemo = null" />

    <!-- 大图查看 -->
    <div v-if="bigImg" class="pv-big" @click="bigImg = null">
      <img :src="bigImg.img" :alt="bigImg.name" />
      <div class="pv-big-nm">{{ bigImg.name }}</div>
    </div>
  </div>
</template>

<style scoped>
.pv { padding: 18px 14px 60px; max-width: 480px; margin: 0 auto; color: #fff; }
.pv h1 { font-size: 20px; font-weight: 800; margin: 4px 2px 18px; }
.pv-sub { display: block; font-size: 12px; font-weight: 400; color: rgba(255,255,255,.55); margin-top: 4px; }
section { margin-bottom: 24px; }
section h2 { font-size: 15px; font-weight: 700; margin: 0 2px 11px; padding-left: 9px; border-left: 3px solid #ffd86b; }
.pv-btns { display: flex; flex-wrap: wrap; gap: 9px; }
.pv-btns button, .pv-row button { padding: 10px 14px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700;
  color: #1a1426; background: linear-gradient(90deg, #ffd86b, #ffb347); cursor: pointer; }
.pv-btns button:active, .pv-row button:active { transform: scale(.95); }
.pv-row { display: flex; align-items: center; gap: 12px; }
.pv-chip { font-size: 18px; font-weight: 800; color: #ffd86b; background: rgba(255,255,255,.06); padding: 8px 16px; border-radius: 12px; }
/* 时间银行卡 */
.bank-card { border-radius: 22px; padding: 22px 18px; text-align: center;
  background: radial-gradient(120% 90% at 50% 0%, rgba(124,107,255,.3), transparent 60%), linear-gradient(160deg, rgba(255,216,107,.1), rgba(255,255,255,.04));
  border: 1px solid rgba(255,216,107,.3); }
.bank-label { font-size: 13px; color: rgba(255,255,255,.7); }
.bank-bal { font-size: 46px; font-weight: 800; color: #ffd86b; line-height: 1.1; text-shadow: 0 0 22px rgba(255,216,107,.5); margin: 4px 0 14px; }
.bank-bal.bump { animation: balPush .43s cubic-bezier(.2,1.7,.4,1); }
@keyframes balPush { 0%{ transform: translateY(12px) scale(1) } 45%{ transform: translateY(-7px) scale(1.14) } 100%{ transform: translateY(0) scale(1) } }
.bank-unit { font-size: 17px; font-weight: 700; color: rgba(255,255,255,.65); margin-left: 4px; }
.bank-collect { padding: 11px 20px; border: none; border-radius: 999px; font-size: 14px; font-weight: 700; color: #1a1426;
  background: linear-gradient(90deg, #6bffb0, #8be9ff); cursor: pointer; box-shadow: 0 0 18px -4px #6bffb0; animation: bcPulse 1.8s ease-in-out infinite; }
.bank-collect.off { background: rgba(255,255,255,.12); color: rgba(255,255,255,.5); box-shadow: none; animation: none; }
@keyframes bcPulse { 0%,100%{ transform: scale(1) } 50%{ transform: scale(1.05) } }
.bank-tip { font-size: 11px; color: rgba(255,255,255,.55); margin-top: 12px; line-height: 1.5; }
/* 画廊 */
.pv-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.pv-grid.rooms { grid-template-columns: 1fr 1fr; }
.pv-cell { cursor: pointer; text-align: center; transition: transform .12s; }
.pv-cell:active { transform: scale(.95); }
.pv-pic { aspect-ratio: 1; border-radius: 14px; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 35%, rgba(124,107,255,.2), rgba(255,255,255,.05)); border: 1px solid rgba(255,255,255,.1); }
.pv-pic img { width: 84%; height: 84%; object-fit: contain; }
.pv-room { aspect-ratio: 3/2; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,.1); }
.pv-room img { width: 100%; height: 100%; object-fit: cover; }
.pv-nm { font-size: 11px; font-weight: 600; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pv-big { position: fixed; inset: 0; z-index: 95; background: rgba(6,4,16,.92); display: grid; place-items: center; padding: 24px; cursor: zoom-out; }
.pv-big img { max-width: 100%; max-height: 80%; object-fit: contain; filter: drop-shadow(0 8px 30px rgba(0,0,0,.6)); }
.pv-big-nm { color: #fff; font-size: 16px; font-weight: 700; margin-top: 14px; }
</style>
