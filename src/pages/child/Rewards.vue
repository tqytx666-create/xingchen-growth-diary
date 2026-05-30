<script setup>
import { computed } from 'vue'
import { db, child, bank, credit } from '../../lib/store.js'
import { createRequest } from '../../services/rewardService.js'
import { levelInfo } from '../../services/creditService.js'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'

const cat = computed(() => db.reward_catalog)
const myReqs = computed(() => db.reward_requests.filter(r => r.child_id === child().id).slice(0, 30))
const trust = computed(() => levelInfo(credit().credit_score))
const STATUS = { pending: '⏳ 等待家人处理', approved: '✅ 已通过', rejected: '❌ 未通过', fulfilled: '🎉 已兑换' }

function req(r) {
  try { createRequest(r.id, child().id); toast('已提交兑换申请,等家人处理 ✨') }
  catch (e) { toast(e.message) }
}
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">🎁 奖励兑换</h2>

    <div class="card" style="padding:13px;margin-bottom:14px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.75)">
      当前信任等级 <b style="color:#ffd86b">Lv.{{ trust.stars }} {{ trust.name }}</b>。诚信越高,以后兑换越划算(折扣公式开发中)。
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
      <div v-for="r in cat" :key="r.id" class="card" style="padding:14px;text-align:center">
        <div style="font-size:14px;font-weight:600;min-height:38px">{{ r.reward_name }}</div>
        <div class="dim" style="font-size:12px;margin:6px 0">
          {{ r.cost_type==='time_bank' ? r.base_cost + ' 分钟' : '家人审批' }}
        </div>
        <button class="btn-accent" style="width:100%;padding:9px;font-size:13px" @click="req(r)">申请兑换</button>
      </div>
    </div>

    <div style="font-weight:600;margin:6px 2px 10px">我的申请</div>
    <div v-if="!myReqs.length" class="dim" style="text-align:center;padding:24px 0">还没有兑换申请</div>
    <div v-for="r in myReqs" :key="r.id" class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 13px;margin-bottom:8px">
      <div>
        <div style="font-size:14px">{{ r.reward_name }}</div>
        <div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(r.requested_at) }}</div>
      </div>
      <span style="font-size:12px">{{ STATUS[r.status] }}</span>
    </div>
  </div>
</template>
