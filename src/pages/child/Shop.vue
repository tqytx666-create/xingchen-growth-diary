<script setup>
import { computed, ref } from 'vue'
import { coins } from '../../services/coinService.js'
import { shopCatalog, buy, redeemWish } from '../../services/shopService.js'
import { ownedItems } from '../../services/itemService.js'
import { WISH } from '../../lib/shop.js'
import { toast } from '../../lib/toast.js'
import { sfx } from '../../lib/sound.js'

const bal = computed(() => coins())
const catalog = computed(() => shopCatalog())
const itemCounts = computed(() => { const o = {}; ownedItems().forEach(i => (o[i.key] = i.count)); return o })

const buying = ref(false)
function purchase(type, g) {
  if (buying.value) return            // 防连点重复扣币(尤其道具是消耗品)
  buying.value = true
  setTimeout(() => { buying.value = false }, 350)
  const r = buy(type, g.key)
  if (r.ok) { sfx.levelup(); toast(`购买成功!${g.emoji}「${g.name}」${type === 'item' ? '已放进道具栏' : type === 'skin' ? '去签到页装扮它~' : type === 'room' || type === 'furniture' ? '去首页🏠/🛋️用它~' : ''}`) }
  else { toast(r.msg) }
}

// 商品详情弹窗
const detail = ref(null)   // { type, g }
function openDetail(type, g) { detail.value = { type, g } }
function buyDetail() { if (!detail.value) return; const d = detail.value; detail.value = null; purchase(d.type, d.g) }

// 心愿兑换(实物/阅读时间)
const wishes = WISH
function redeem(w) {
  if (buying.value) return
  buying.value = true
  setTimeout(() => { buying.value = false }, 350)
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
          <div class="shop-pic" style="cursor:pointer" @click="openDetail(sec.type, g)"><img :src="g.img" :alt="g.name" /><span class="shop-info">ⓘ</span></div>
          <div class="shop-nm" style="cursor:pointer" @click="openDetail(sec.type, g)">{{ g.emoji }} {{ g.name }}</div>
          <div v-if="sec.type==='item' && itemCounts[g.key]" class="dim" style="font-size:10px">已有 {{ itemCounts[g.key] }}</div>
          <button v-if="g.owned" class="shop-buy owned" disabled>已拥有</button>
          <button v-else class="shop-buy" :class="{ poor: bal < g.price }" @click="purchase(sec.type, g)">
            🪙 {{ g.price }}{{ sec.type==='item' ? ' /个' : '' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 商品详情 -->
    <div v-if="detail" class="sd-overlay" @click.self="detail=null">
      <div class="sd-card">
        <div class="sd-pic"><img :src="detail.g.img" :alt="detail.g.name" /></div>
        <div class="sd-name">{{ detail.g.emoji }} {{ detail.g.name }}</div>
        <div class="sd-desc">{{ detail.g.desc }}</div>
        <div v-if="detail.type==='item' && itemCounts[detail.g.key]" class="dim" style="font-size:12px;margin-top:6px">当前持有 {{ itemCounts[detail.g.key] }} 个</div>
        <button v-if="detail.g.owned" class="sd-buy owned" disabled>✅ 已拥有</button>
        <button v-else class="sd-buy" :class="{ poor: bal < detail.g.price }" @click="buyDetail">🪙 {{ detail.g.price }} 购买{{ detail.type==='item' ? ' 1 个' : '' }}</button>
        <button class="sd-close" @click="detail=null">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.shop-card { border-radius: 16px; padding: 10px 8px; text-align: center;
  background: radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.18), transparent 60%), rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08); }
.shop-pic { width: 100%; aspect-ratio: 1; display: grid; place-items: center; position: relative; }
.shop-pic img { width: 78%; height: 78%; object-fit: contain; }
.shop-info { position: absolute; top: 2px; right: 2px; font-size: 11px; color: rgba(255,255,255,.45); }
/* 商品详情弹窗 */
.sd-overlay { position: fixed; inset: 0; z-index: 75; display: grid; place-items: center; padding: 24px;
  background: rgba(6,4,16,.78); backdrop-filter: blur(4px); animation: sdf .2s ease; }
.sd-card { width: 100%; max-width: 320px; background: #14111f; border: 1px solid rgba(255,255,255,.12);
  border-radius: 22px; padding: 20px; text-align: center; }
.sd-pic { width: 100%; aspect-ratio: 1; display: grid; place-items: center;
  background: radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.25), transparent 62%); border-radius: 16px; }
.sd-pic img { width: 80%; height: 80%; object-fit: contain; }
.sd-name { font-size: 17px; font-weight: 700; margin: 12px 0 6px; }
.sd-desc { font-size: 13px; color: rgba(255,255,255,.7); line-height: 1.6; }
.sd-buy { width: 100%; margin-top: 16px; padding: 12px; border: none; border-radius: 13px; font-size: 15px;
  font-weight: 700; color: #1a1426; background: linear-gradient(90deg, #ffd86b, #ffb347); cursor: pointer; }
.sd-buy.poor { background: rgba(255,255,255,.12); color: rgba(255,255,255,.55); }
.sd-buy.owned { background: rgba(107,255,176,.15); color: #9bffcf; cursor: default; }
.sd-close { width: 100%; margin-top: 8px; padding: 9px; border: none; border-radius: 11px; background: transparent;
  color: rgba(255,255,255,.5); font-size: 13px; cursor: pointer; }
@keyframes sdf { from { opacity: 0 } to { opacity: 1 } }
.shop-nm { font-size: 12px; font-weight: 600; margin: 2px 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shop-buy { width: 100%; padding: 6px; border: none; border-radius: 9px; font-size: 12px; font-weight: 700;
  color: #1a1426; background: linear-gradient(90deg, #ffd86b, #ffb347); cursor: pointer; }
.shop-buy.poor { background: rgba(255,255,255,.12); color: rgba(255,255,255,.55); }
.shop-buy.owned { background: rgba(107,255,176,.15); color: #9bffcf; cursor: default; }
</style>
