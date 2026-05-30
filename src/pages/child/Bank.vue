<script setup>
import { ref, computed } from 'vue'
import { db, bank, child } from '../../lib/store.js'
import { spendMinutes } from '../../services/timeBankService.js'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'

const b = computed(() => bank())
const mins = ref('')
const logs = computed(() => db.time_bank_transactions.slice(0, 60))
const META = {
  deposit: { ic: '🏃', label: '运动存入' }, withdraw: { ic: '🎮', label: '游戏使用' },
  bonus: { ic: '🎁', label: '奖励时间' }, interest: { ic: '💎', label: '每日利息' },
  penalty: { ic: '⚠️', label: '扣减' }, adjustment: { ic: '🔧', label: '调整' }
}
function spend() {
  const n = parseInt(mins.value)
  if (!(n > 0)) { toast('请输入要使用的分钟数'); return }
  try { spendMinutes({ minutes: n, createdBy: child().id }); toast(`扣除成功!使用 ${n} 分钟 🎮`); mins.value = '' }
  catch (e) { toast(e.message) }
}
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">⏱️ 时间银行</h2>

    <div class="card" style="text-align:center;padding:22px;margin-bottom:14px;background:linear-gradient(160deg,rgba(124,107,255,.2),rgba(255,255,255,.08))">
      <div style="font-size:40px;font-weight:800;color:#ffd86b">{{ Math.floor(b.current_balance_minutes) }}</div>
      <div class="dim" style="font-size:14px">分钟 游戏时间余额</div>
      <div class="dim" style="font-size:11px;margin-top:6px">每日 {{ b.interest_enabled ? '+1% 利息' : '利息已关闭' }}</div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:10px">🎮 取时间(玩游戏)</div>
      <input type="number" inputmode="numeric" v-model="mins" placeholder="使用多少分钟,比如 30" />
      <button class="btn-accent" style="width:100%;padding:13px;margin-top:12px" @click="spend">扣除时间</button>
      <div class="dim" style="font-size:12px;margin-top:10px">💡 运动存时间:在「今日任务」打羽毛球卡可换游戏时间(1 分钟运动 = 2 分钟游戏)。</div>
    </div>

    <div style="font-weight:600;margin:6px 2px 10px">流水</div>
    <div v-if="!logs.length" class="dim" style="text-align:center;padding:24px 0">还没有流水</div>
    <div v-for="t in logs" :key="t.id" class="card" style="display:flex;align-items:center;gap:10px;padding:11px 13px;margin-bottom:8px">
      <span style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08)">{{ (META[t.type]||{}).ic }}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px">{{ (META[t.type]||{}).label }}</div>
        <div class="dim" style="font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ fmtDateTime(t.created_at) }} · {{ t.description }}</div>
      </div>
      <span style="font-weight:700" :style="t.screen_minutes>=0 ? 'color:#6bffb0' : 'color:#ff7a7a'">{{ t.screen_minutes>=0 ? '+' : '' }}{{ t.screen_minutes }}</span>
    </div>
  </div>
</template>
