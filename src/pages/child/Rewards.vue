<script setup>
import { computed, ref } from 'vue'
import { db, child, credit, streak, bank } from '../../lib/store.js'
import { coins } from '../../services/coinService.js'
import CountUp from '../../components/CountUp.vue'
import CoinIcon from '../../components/CoinIcon.vue'
import { REWARDS, metricValue } from '../../lib/rewardConfig.js'
import { createRequest, rewardState, ownedFreezeCards } from '../../services/rewardService.js'
import { ownedBoxes, openOneByTier } from '../../services/checkinService.js'
import { levelInfo } from '../../services/creditService.js'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'
import { sfx } from '../../lib/sound.js'
import BoxModal from '../../components/pet/BoxModal.vue'
// 奖励卡片插画
import imgMiniso from '../../assets/reward/r_miniso.webp'
import imgCard from '../../assets/reward/r_card_nostreak.webp'
import imgFamily from '../../assets/reward/r_family.webp'
import imgKing from '../../assets/reward/r_king.webp'
import imgBig from '../../assets/reward/r_big.webp'
// 宝箱图
import boxIron from '../../assets/box/box_iron.webp'
import boxBronze from '../../assets/box/box_bronze.webp'
import boxSilver from '../../assets/box/box_silver.webp'
import boxGold from '../../assets/box/box_gold.webp'
import boxDiamond from '../../assets/box/box_diamond.webp'

// 每个奖励的插画 + 稀有度(决定卡片质感)
const ART = { r_miniso: imgMiniso, r_card_nostreak: imgCard, r_family: imgFamily, r_king: imgKing, r_big: imgBig }
const RARITY = {
  r_miniso:       { t: '稀有', c: '#7cc6ff' },
  r_card_nostreak:{ t: '实用', c: '#9bffcf' },
  r_family:       { t: '史诗', c: '#c79bff' },
  r_king:         { t: '史诗', c: '#ff9ec7' },
  r_big:          { t: '传说', c: '#ffd86b' }
}

const s = computed(() => streak())
const trust = computed(() => levelInfo(credit().credit_score))
const freezeCards = computed(() => ownedFreezeCards())
const myReqs = computed(() => db.reward_requests.filter(r => r.child_id === child().id).slice(0, 30))
const STATUS = { pending: '⏳ 等家人处理', rejected: '❌ 未通过', fulfilled: '🎉 已兑换' }

const list = computed(() => REWARDS.map(r => {
  const stt = rewardState(r, s.value)
  const cur = metricValue(r, s.value)
  return { ...r, ...stt, cur, pct: Math.min(100, Math.round(cur / r.target * 100)),
    art: ART[r.id], rarity: RARITY[r.id] || { t: '普通', c: '#aaa' } }
}))

function req(r) {
  try { createRequest(r.id, child().id); toast('已提交申请,等家人处理 ✨') }
  catch (e) { toast(e.message) }
}

// ---- 宝箱库存 ----
const boxes = computed(() => ownedBoxes())
const BOX_META = {
  iron:    { img: boxIron,    name: '铁宝箱',   range: '1~2 分 · 3~6 星币' },
  bronze:  { img: boxBronze,  name: '铜宝箱',   range: '2~3 分 · 5~10 星币' },
  silver:  { img: boxSilver,  name: '银宝箱',   range: '2~4 分 · 8~14 星币' },
  gold:    { img: boxGold,    name: '金宝箱',   range: '4~6 分 · 12~20 星币' },
  diamond: { img: boxDiamond, name: '钻石宝箱', range: '8~12 分 · 25~40 星币' }
}
const boxTiers = ['iron', 'bronze', 'silver', 'gold', 'diamond']
const hasBox = computed(() => boxTiers.some(t => (boxes.value[t] || 0) > 0))
const boxReward = ref(null)   // { tier, minutes } 开箱动画
const opening = ref(false)    // 防连点:一次只开一个
function openBox(tier) {
  if (opening.value) return
  if ((boxes.value[tier] || 0) < 1) return
  opening.value = true
  const r = openOneByTier(tier)
  if (r) {
    sfx.levelup(); boxReward.value = r
    if (r.coins) setTimeout(() => toast(`🪙 开箱还得到 ${r.coins} 星币!`), 2500)
    if (r.item) setTimeout(() => toast(`🎁 还开出了道具 ${r.item.emoji}「${r.item.name}」!去首页用它陪小愿`), r.coins ? 3300 : 2500)
  } else {
    opening.value = false   // 没开成,释放锁
  }
}
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin:4px 2px 14px">
      <h2 style="font-size:18px;font-weight:700;border-left:3px solid #ffd86b;padding-left:10px;margin:0">🎁 奖励成就</h2>
      <!-- 开箱所得当场看见涨:时间 + 星币余额(CountUp 滚动) -->
      <span style="display:flex;gap:7px;font-size:12px;font-weight:700">
        <span class="card" style="padding:5px 10px;color:#8be9ff">⏱ <CountUp :value="Math.floor(bank()?.current_balance_minutes || 0)" />分</span>
        <span class="card" style="padding:5px 10px;color:#ffd86b"><CoinIcon /> <CountUp :value="coins()" /></span>
      </span>
    </div>

    <div class="card" style="padding:13px;margin-bottom:16px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.75)">
      坚持英语签到来解锁奖励。当前信任 <b style="color:#ffd86b">Lv.{{ trust.stars }} {{ trust.name }}</b>。
    </div>

    <!-- 宝箱库存 -->
    <div class="card" style="padding:16px;margin-bottom:18px">
      <div style="font-weight:700;margin-bottom:3px">🧰 我的宝箱</div>
      <div class="dim" style="font-size:11px;margin-bottom:12px">完成支线任务获得宝箱,点击打开抽游戏时间(自动到时间银行)</div>
      <div v-if="hasBox" class="box-row">
        <button v-for="t in boxTiers" :key="t" v-show="boxes[t] > 0" class="box-stack" @click="openBox(t)">
          <div class="box-thumb"><img :src="BOX_META[t].img" :alt="BOX_META[t].name" /><span class="box-badge">{{ boxes[t] }}</span></div>
          <div class="box-nm">{{ BOX_META[t].name }}</div>
        </button>
      </div>
      <div v-else class="dim" style="font-size:13px;text-align:center;padding:14px 0">还没有宝箱~ 完成刷牙/洗澡/洗头/房间等任务来获得 🎁</div>
    </div>

    <!-- 奖励卡片 -->
    <div style="font-weight:700;margin:4px 2px 12px">✨ 特权奖励</div>
    <div class="rw-grid">
      <div v-for="r in list" :key="r.id" class="rw-card" :class="{ locked: !r.unlocked, claimable: r.unlocked && !r.fulfilled && !r.pending }"
           :style="{ '--rc': r.rarity.c }">
        <div class="rw-art">
          <img :src="r.art" :alt="r.name" :style="r.unlocked ? '' : 'filter:grayscale(.85) brightness(.55)'" />
          <span class="rw-rarity">{{ r.rarity.t }}</span>
          <span v-if="!r.unlocked" class="rw-lock">🔒</span>
          <div class="rw-art-fade"></div>
          <div class="rw-name">{{ r.name }}</div>
        </div>
        <div class="rw-body">
          <div class="rw-req">🔥 {{ r.metric==='week' ? '本周满勤' : '连续签到' }} <b>{{ r.target }}</b> 天</div>
          <div v-if="r.id==='r_card_nostreak' && freezeCards>0" class="rw-own">🛡️ 持有 {{ freezeCards }} 张 · 漏打去签到页补卡</div>

          <!-- 未解锁:进度条 -->
          <div v-if="!r.unlocked" class="rw-prog">
            <div class="bar"><i :style="{ width: r.pct + '%', background: 'linear-gradient(90deg,#7c6bff,var(--rc))' }"></i></div>
            <span class="dim" style="font-size:10px">{{ r.cur }}/{{ r.target }}</span>
          </div>
          <!-- 已解锁:状态/按钮 -->
          <button v-else-if="!r.fulfilled && !r.pending" class="rw-btn" @click="req(r)">领取 →</button>
          <div v-else-if="r.pending" class="rw-state" style="color:#ffd86b">⏳ 等家人处理</div>
          <div v-else-if="r.fulfilled && r.milestone" class="rw-state" style="color:#6bffb0">🎉 已获得</div>
          <div v-else class="rw-state" style="color:#6bffb0">✓ 可再申请</div>
        </div>
      </div>
    </div>

    <div style="font-weight:600;margin:22px 2px 10px">我的申请记录</div>
    <div v-if="!myReqs.length" class="dim" style="text-align:center;padding:20px 0">还没有申请记录</div>
    <div v-for="r in myReqs" :key="r.id" class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 13px;margin-bottom:8px">
      <div><div style="font-size:14px">{{ r.reward_name }}</div><div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(r.requested_at) }}</div></div>
      <span style="font-size:12px">{{ STATUS[r.status] }}</span>
    </div>

    <BoxModal v-if="boxReward" :tier="boxReward.tier" :minutes="boxReward.minutes" :coins="boxReward.coins || 0" @close="boxReward=null; opening=false" />
  </div>
</template>

<style scoped>
/* 宝箱库存:一排紧凑放,只显示宝箱图+数量 */
.box-row { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-start; }
.box-stack { background:none; border:none; padding:0; cursor:pointer; text-align:center; color:#fff; transition:transform .12s; flex:0 0 auto; }
.box-stack:active { transform:scale(.92); }
.box-thumb { position:relative; width:62px; height:62px; border-radius:14px; display:grid; place-items:center;
  background:radial-gradient(circle at 50% 35%, rgba(255,216,107,.25), rgba(255,255,255,.05)); border:1px solid rgba(255,255,255,.12); }
.box-thumb img { width:48px; height:48px; object-fit:contain; filter:drop-shadow(0 4px 8px rgba(0,0,0,.4)); animation:bob 2.4s ease-in-out infinite; }
.box-nm { font-size:10px; font-weight:600; margin-top:3px; color:rgba(255,255,255,.8); white-space:nowrap; }
.box-badge { position:absolute; top:-5px; right:-5px; background:#ff7a7a; color:#fff; font-size:11px; font-weight:800;
  border-radius:999px; min-width:18px; padding:1px 5px; box-shadow:0 2px 6px rgba(0,0,0,.4); }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

/* 奖励卡片 */
.rw-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.rw-card { border-radius:18px; overflow:hidden; background:#16121f; border:1px solid rgba(255,255,255,.08);
  position:relative; transition:transform .15s; }
.rw-card.claimable { border-color:var(--rc); box-shadow:0 0 14px -2px var(--rc); animation:claimGlow 2.2s ease-in-out infinite; }
.rw-art { position:relative; aspect-ratio:1; overflow:hidden; }
.rw-art img { width:100%; height:100%; object-fit:cover; display:block; }
.rw-art-fade { position:absolute; inset:0; background:linear-gradient(to bottom, transparent 55%, rgba(22,18,31,.96)); }
.rw-rarity { position:absolute; top:8px; left:8px; font-size:10px; font-weight:700; color:#1a1426;
  background:var(--rc); border-radius:999px; padding:2px 9px; box-shadow:0 2px 6px rgba(0,0,0,.3); }
.rw-lock { position:absolute; top:8px; right:8px; font-size:16px; }
.rw-name { position:absolute; left:10px; right:10px; bottom:8px; font-size:14px; font-weight:800; color:#fff;
  text-shadow:0 1px 4px rgba(0,0,0,.6); line-height:1.2; }
.rw-body { padding:10px 11px 12px; }
.rw-req { font-size:11px; color:rgba(255,255,255,.7); }
.rw-req b { color:var(--rc); font-size:13px; }
.rw-own { font-size:10px; color:#ffd86b; margin-top:4px; }
.rw-prog { display:flex; align-items:center; gap:7px; margin-top:9px; }
.rw-prog .bar { flex:1; }
.rw-btn { width:100%; margin-top:10px; padding:8px; border:none; border-radius:10px; font-size:13px; font-weight:700;
  color:#1a1426; background:linear-gradient(90deg,#ffd86b,#ffb347); cursor:pointer; }
.rw-state { margin-top:10px; font-size:12px; font-weight:600; text-align:center; }
@keyframes claimGlow { 0%,100%{box-shadow:0 0 8px -2px var(--rc);} 50%{box-shadow:0 0 18px 0 var(--rc);} }
@media (prefers-reduced-motion: reduce){ .rw-card.claimable{animation:none} .box-thumb img{animation:none} }
</style>
