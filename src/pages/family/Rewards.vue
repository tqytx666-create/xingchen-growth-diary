<script setup>
import { computed } from 'vue'
import { db, currentUser } from '../../lib/store.js'
import { handleRequest } from '../../services/rewardService.js'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'

const me = computed(() => currentUser())
const pending = computed(() => db.reward_requests.filter(r => r.status === 'pending'))
const history = computed(() => db.reward_requests.filter(r => r.status !== 'pending').slice(0, 30))
const STATUS = { rejected: '❌ 已拒绝', fulfilled: '🎉 已兑换', approved: '✅ 已通过' }

function approve(r) { handleRequest(r.id, true, me.value.id); toast('已通过兑换 🎉') }
function reject(r) { handleRequest(r.id, false, me.value.id); toast('已拒绝') }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">🎁 兑换处理</h2>

    <div style="font-weight:600;margin:6px 2px 10px">待处理 ({{ pending.length }})</div>
    <div v-if="!pending.length" class="dim" style="text-align:center;padding:20px 0">没有待处理的申请</div>
    <div v-for="r in pending" :key="r.id" class="card" style="padding:13px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between">
        <div><div style="font-size:15px;font-weight:600">{{ r.reward_name }}</div>
          <div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(r.requested_at) }} · {{ r.cost_type==='coin' ? '已付 ' + r.coin_cost + ' 星币(拒绝会退还)' : r.cost_type==='time_bank' ? '成本 ' + r.final_cost + ' 分钟' : '家人审批' }}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn-accent" style="flex:1;padding:9px" @click="approve(r)">通过</button>
        <button class="btn-ghost" style="flex:1;padding:9px;border-color:rgba(255,122,122,.4);color:#ffb3b3" @click="reject(r)">拒绝</button>
      </div>
    </div>

    <div style="font-weight:600;margin:18px 2px 10px">历史</div>
    <div v-if="!history.length" class="dim" style="text-align:center;padding:20px 0">还没有处理过的兑换记录</div>
    <div v-for="r in history" :key="r.id" class="card" style="display:flex;justify-content:space-between;padding:11px 13px;margin-bottom:8px">
      <div><div style="font-size:14px">{{ r.reward_name }}</div><div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(r.handled_at) }}</div></div>
      <span style="font-size:12px">{{ STATUS[r.status] }}</span>
    </div>
  </div>
</template>
