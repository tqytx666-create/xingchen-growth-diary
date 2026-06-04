<script setup>
import { computed } from 'vue'
import { coins } from '../../services/coinService.js'
import { shopCatalog, buy, redeemWish } from '../../services/shopService.js'
import { ownedItems } from '../../services/itemService.js'
import { WISH } from '../../lib/shop.js'
import { toast } from '../../lib/toast.js'
import { sfx } from '../../lib/sound.js'

const bal = computed(() => coins())
const catalog = computed(() => shopCatalog())
const itemCounts = computed(() => { const o = {}; ownedItems().forEach(i => (o[i.key] = i.count)); return o })

function purchase(type, g) {
  const r = buy(type, g.key)
  if (r.ok) { sfx.levelup(); toast(`购买成功!${g.emoji}「${g.name}」${type === 'item' ? '已放进道具栏' : type === 'skin' ? '去签到页装扮它~' : type === 'room' || type === 'furniture' ? '去首页🏠/🛋️用它~' : ''}`) }
  else { toast(r.msg) }
}

// 心愿兑换(实物/阅读时间)
const wishes = WISH
function redeem(w) {
  const r = redeemWish(w.key)
  if (r.ok) { sfx.levelup(); toast(`已下单 ${w.emoji}「${w.name}」!告诉爸爸妈妈,通过后兑现~`) }
  else { toast(r.msg) }
}
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin:4px 2px 14px">
      <h2 style="font-size:18px;font-weight:700;border-left:3px solid #ffd86b;padding-left:10px;margin:0">🛍️ 星币商城</h2>
      <span class="card" style="padding:6px 13px;font-size:15px;font-weight:700;color:#ffd86b">🪙 {{ bal }}</span>
    </div>
    <div class="card" style="padding:12px 14px;margin-bottom:16px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.75)">
      完成打卡(英语 +10🪙 / 支线 +5🪙)赚星币,在这里购买喜欢的皮肤、房间、家具和道具。星币只能靠打卡赚哦~
    </div>

    <!-- 心愿兑换:用星币换现实里想要的东西 -->
    <div style="margin-bottom:22px">
      <div style="font-weight:700;margin:2px 2px 4px">🌠 心愿兑换</div>
      <div class="dim" style="font-size:11px;margin-bottom:10px">用星币兑换现实奖励,下单后告诉爸爸妈妈,通过了就兑现给你~</div>
      <div v-for="w in wishes" :key="w.key" class="card" style="display:flex;align-items:center;gap:12px;padding:12px 13px;margin-bottom:9px">
        <div style="font-size:26px">{{ w.emoji }}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600">{{ w.name }}</div>
          <div class="dim" style="font-size:11px;margin-top:1px">{{ w.note }}</div>
        </div>
        <button class="shop-buy" style="width:auto;padding:7px 13px" :class="{ poor: bal < w.price }" @click="redeem(w)">🪙 {{ w.price }}</button>
      </div>
    </div>

    <div v-for="sec in catalog" :key="sec.type" style="margin-bottom:20px">
      <div style="font-weight:700;margin:2px 2px 10px">{{ sec.title }}</div>
      <div class="shop-grid">
        <div v-for="g in sec.items" :key="g.key" class="shop-card">
          <div class="shop-pic"><img :src="g.img" :alt="g.name" /></div>
          <div class="shop-nm">{{ g.emoji }} {{ g.name }}</div>
          <div v-if="sec.type==='item' && itemCounts[g.key]" class="dim" style="font-size:10px">已有 {{ itemCounts[g.key] }}</div>
          <button v-if="g.owned" class="shop-buy owned" disabled>已拥有</button>
          <button v-else class="shop-buy" :class="{ poor: bal < g.price }" @click="purchase(sec.type, g)">
            🪙 {{ g.price }}{{ sec.type==='item' ? ' /个' : '' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.shop-card { border-radius: 16px; padding: 10px 8px; text-align: center;
  background: radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.18), transparent 60%), rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08); }
.shop-pic { width: 100%; aspect-ratio: 1; display: grid; place-items: center; }
.shop-pic img { width: 78%; height: 78%; object-fit: contain; }
.shop-nm { font-size: 12px; font-weight: 600; margin: 2px 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shop-buy { width: 100%; padding: 6px; border: none; border-radius: 9px; font-size: 12px; font-weight: 700;
  color: #1a1426; background: linear-gradient(90deg, #ffd86b, #ffb347); cursor: pointer; }
.shop-buy.poor { background: rgba(255,255,255,.12); color: rgba(255,255,255,.55); }
.shop-buy.owned { background: rgba(107,255,176,.15); color: #9bffcf; cursor: default; }
</style>
