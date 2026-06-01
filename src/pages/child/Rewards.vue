<script setup>
import { computed } from 'vue'
import { db, child, credit, streak } from '../../lib/store.js'
import { REWARDS, metricValue } from '../../lib/rewardConfig.js'
import { createRequest, rewardState, ownedFreezeCards } from '../../services/rewardService.js'
import { levelInfo } from '../../services/creditService.js'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'

const s = computed(() => streak())
const trust = computed(() => levelInfo(credit().credit_score))
const freezeCards = computed(() => ownedFreezeCards())
const myReqs = computed(() => db.reward_requests.filter(r => r.child_id === child().id).slice(0, 30))
const STATUS = { pending: '⏳ 等家人处理', rejected: '❌ 未通过', fulfilled: '🎉 已兑换' }

const list = computed(() => REWARDS.map(r => {
  const stt = rewardState(r, s.value)
  const cur = metricValue(r, s.value)
  return { ...r, ...stt, cur, pct: Math.min(100, Math.round(cur / r.target * 100)) }
}))

function req(r) {
  try { createRequest(r.id, child().id); toast('已提交申请,等家人处理 ✨') }
  catch (e) { toast(e.message) }
}
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">🎁 奖励成就</h2>

    <div class="card" style="padding:13px;margin-bottom:14px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.75)">
      坚持英语签到来解锁奖励。当前信任 <b style="color:#ffd86b">Lv.{{ trust.stars }} {{ trust.name }}</b>。游戏时间不在这里申请,由家长直接帮你存取。
    </div>

    <div v-for="r in list" :key="r.id" class="card reward-card" style="padding:14px;margin-bottom:12px;position:relative;overflow:hidden"
         :class="{ claimable: r.unlocked && !r.fulfilled && !r.pending, legendary: r.id==='r_big' }"
         :style="r.unlocked ? 'border-color:rgba(255,216,107,.4)' : ''">
      <div style="display:flex;align-items:center;gap:12px;position:relative;z-index:1">
        <div style="font-size:30px" :class="{ 'icon-bounce': r.unlocked && !r.fulfilled && !r.pending }" :style="r.unlocked ? '' : 'opacity:.5;filter:grayscale(1)'">{{ r.icon }}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600">{{ r.name }}
            <span v-if="r.id==='r_big'" style="font-size:9px;padding:1px 6px;border-radius:999px;background:rgba(255,216,107,.2);color:#ffd86b;margin-left:4px">传说</span>
          </div>
          <div class="dim" style="font-size:12px;margin-top:2px">{{ r.desc }}</div>
          <div v-if="r.id==='r_card_nostreak' && freezeCards>0" style="font-size:11px;color:#ffd86b;margin-top:3px;font-weight:600">🛡️ 持有 {{ freezeCards }} 张 · 漏打英语时去「🔥 签到」页补卡</div>
          <div v-if="r.unlocked && !r.fulfilled && !r.pending" style="font-size:11px;color:#6bffb0;margin-top:3px;font-weight:600">✨ 可以领取啦!</div>
        </div>
        <!-- 右侧状态 -->
        <button v-if="r.unlocked && !r.fulfilled && !r.pending" class="btn-accent" style="padding:9px 14px;font-size:13px" @click="req(r)">申请</button>
        <span v-else-if="r.pending" style="font-size:12px;color:#ffd86b;text-align:center;line-height:1.4">⏳ 等家人<br>处理</span>
        <span v-else-if="r.fulfilled && r.milestone" style="font-size:12px;color:#6bffb0;text-align:center;line-height:1.4">🎉 已<br>获得</span>
        <span v-else-if="r.fulfilled" style="font-size:12px;color:#6bffb0">可再次申请</span>
        <span v-else style="font-size:20px">🔒</span>
      </div>
      <!-- 进度条(未达成时) -->
      <div v-if="!r.unlocked" style="margin-top:10px;position:relative;z-index:1">
        <div class="bar"><i style="background:linear-gradient(90deg,#7c6bff,#ffd86b)" :style="{width: r.pct + '%'}"></i></div>
        <div class="dim" style="font-size:11px;margin-top:5px;text-align:right">{{ r.cur }} / {{ r.target }} 天</div>
      </div>
    </div>

    <div style="font-weight:600;margin:18px 2px 10px">我的申请记录</div>
    <div v-if="!myReqs.length" class="dim" style="text-align:center;padding:20px 0">还没有申请记录</div>
    <div v-for="r in myReqs" :key="r.id" class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 13px;margin-bottom:8px">
      <div><div style="font-size:14px">{{ r.reward_name }}</div><div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(r.requested_at) }}</div></div>
      <span style="font-size:12px">{{ STATUS[r.status] }}</span>
    </div>
  </div>
</template>

<style scoped>
/* 可领取:金色光晕呼吸 */
.reward-card.claimable { animation: claimGlow 2s ease-in-out infinite; }
@keyframes claimGlow {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,216,107,0); }
  50% { box-shadow: 0 0 14px 1px rgba(255,216,107,.35); }
}
.icon-bounce { display: inline-block; animation: iconBounce 1.4s ease-in-out infinite; }
@keyframes iconBounce { 0%,100%{transform:translateY(0) rotate(0);} 30%{transform:translateY(-4px) rotate(-6deg);} 60%{transform:translateY(0) rotate(5deg);} }
/* 传说级:流光扫过边框 */
.reward-card.legendary::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(255,216,107,.7) 50%, transparent 70%);
  background-size: 250% 100%;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: legendSweep 3.5s linear infinite;
}
@keyframes legendSweep { 0%{background-position:120% 0;} 100%{background-position:-120% 0;} }
@media (prefers-reduced-motion: reduce) {
  .reward-card.claimable, .icon-bounce, .reward-card.legendary::before { animation: none !important; }
}
</style>
