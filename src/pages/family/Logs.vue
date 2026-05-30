<script setup>
import { ref, computed } from 'vue'
import { db } from '../../lib/store.js'
import { fmtDateTime } from '../../lib/util.js'

const tab = ref('credit')
const tabs = [['credit', '💎 诚信分'], ['bank', '⏱️ 时间银行'], ['pet', '🐾 宠物'], ['audit', '📜 全部日志']]
function actor(id) { return db.users.find(u => u.id === id)?.display_name || (id === 'system' ? '系统' : '') }
const credit = computed(() => db.credit_transactions.slice(0, 60))
const banktx = computed(() => db.time_bank_transactions.slice(0, 60))
const pet = computed(() => db.pet_events.slice(0, 60))
const audit = computed(() => db.audit_logs.slice(0, 80))
const BANK_LABEL = { deposit: '运动存入', withdraw: '游戏使用', bonus: '奖励', interest: '利息', penalty: '扣减', adjustment: '调整' }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">📒 流水与日志</h2>
    <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto">
      <button v-for="t in tabs" :key="t[0]" class="btn-ghost" style="padding:8px 12px;font-size:13px;white-space:nowrap"
              :style="tab===t[0] ? 'border-color:#ffd86b;color:#ffd86b' : ''" @click="tab=t[0]">{{ t[1] }}</button>
    </div>

    <template v-if="tab==='credit'">
      <div v-if="!credit.length" class="dim" style="text-align:center;padding:24px 0">暂无诚信分变化</div>
      <div v-for="t in credit" :key="t.id" class="card" style="display:flex;justify-content:space-between;padding:11px 13px;margin-bottom:8px">
        <div><div style="font-size:14px">{{ t.reason }}</div><div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(t.created_at) }} · {{ actor(t.created_by) }}</div></div>
        <span style="font-weight:700" :style="t.delta>=0 ? 'color:#6bffb0' : 'color:#ff7a7a'">{{ t.delta>=0 ? '+' : '' }}{{ t.delta }}</span>
      </div>
    </template>

    <template v-else-if="tab==='bank'">
      <div v-if="!banktx.length" class="dim" style="text-align:center;padding:24px 0">暂无流水</div>
      <div v-for="t in banktx" :key="t.id" class="card" style="display:flex;justify-content:space-between;padding:11px 13px;margin-bottom:8px">
        <div><div style="font-size:14px">{{ BANK_LABEL[t.type] }} · {{ t.description }}</div><div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(t.created_at) }}</div></div>
        <span style="font-weight:700" :style="t.screen_minutes>=0 ? 'color:#6bffb0' : 'color:#ff7a7a'">{{ t.screen_minutes>=0 ? '+' : '' }}{{ t.screen_minutes }}</span>
      </div>
    </template>

    <template v-else-if="tab==='pet'">
      <div v-if="!pet.length" class="dim" style="text-align:center;padding:24px 0">暂无宠物事件</div>
      <div v-for="t in pet" :key="t.id" class="card" style="padding:11px 13px;margin-bottom:8px">
        <div style="font-size:14px">{{ t.message }}</div><div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(t.created_at) }}</div>
      </div>
    </template>

    <template v-else>
      <div v-if="!audit.length" class="dim" style="text-align:center;padding:24px 0">暂无日志</div>
      <div v-for="t in audit" :key="t.id" class="card" style="padding:11px 13px;margin-bottom:8px">
        <div style="font-size:13px">{{ actor(t.actor_id) }} · {{ t.action }} <span class="dim" v-if="t.detail && t.detail.task">{{ t.detail.task }}</span></div>
        <div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(t.created_at) }}</div>
      </div>
    </template>
  </div>
</template>
