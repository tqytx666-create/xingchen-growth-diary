<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { db, bank } from '../../lib/store.js'
import { fmtDateTime } from '../../lib/util.js'

const b = computed(() => bank())
const logs = computed(() => db.time_bank_transactions.slice(0, 80))
const META = {
  deposit: { ic: '🏃', label: '运动存入' }, withdraw: { ic: '🎮', label: '游戏使用' },
  bonus: { ic: '🎁', label: '奖励时间' }, interest: { ic: '💎', label: '每日利息' },
  penalty: { ic: '⚠️', label: '扣减' }, adjustment: { ic: '🔧', label: '调整' }
}

// 余额数字滚动
const display = ref(Math.floor(b.value.current_balance_minutes))
let raf = null
function animateTo(target) {
  const start = display.value
  if (start === target) return
  const dur = 700, t0 = performance.now()
  cancelAnimationFrame(raf)
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur)
    const eased = 1 - Math.pow(1 - k, 3)
    display.value = Math.round(start + (target - start) * eased)
    if (k < 1) raf = requestAnimationFrame(step)
    else display.value = target
  }
  raf = requestAnimationFrame(step)
}
watch(() => Math.floor(b.value.current_balance_minutes), (n) => animateTo(n))
onMounted(() => { display.value = Math.floor(b.value.current_balance_minutes) })

// 最近一笔利息(高亮提示)
const lastInterest = computed(() => db.time_bank_transactions.find(t => t.type === 'interest'))
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">⏱️ 时间银行</h2>

    <div class="card" style="text-align:center;padding:24px;margin-bottom:14px;background:linear-gradient(160deg,rgba(124,107,255,.2),rgba(255,255,255,.08))">
      <div style="font-size:46px;font-weight:800;color:#ffd86b;line-height:1;font-variant-numeric:tabular-nums">{{ display }}</div>
      <div class="dim" style="font-size:14px;margin-top:4px">分钟 游戏时间余额</div>
      <div class="dim" style="font-size:12px;margin-top:8px">约 {{ Math.floor(display/60) }} 小时 {{ display%60 }} 分钟可玩</div>
      <div class="dim" style="font-size:11px;margin-top:8px">{{ b.interest_enabled ? '每天 +1% 利息,存着不花更划算 💎' : '利息暂时关闭' }}</div>
    </div>

    <div v-if="lastInterest" class="card" style="padding:11px 13px;margin-bottom:14px;display:flex;align-items:center;gap:10px;border-color:rgba(107,213,255,.4);background:rgba(107,213,255,.08)">
      <span style="font-size:20px">💎</span>
      <div style="flex:1;font-size:13px">最近一笔利息到账 <b style="color:#9fe4ff">+{{ lastInterest.screen_minutes }}</b> 分钟</div>
      <span class="dim" style="font-size:11px">{{ fmtDateTime(lastInterest.created_at) }}</span>
    </div>

    <div class="card" style="padding:13px;margin-bottom:14px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.75)">
      💡 运动完告诉爸爸妈妈,他们会帮你把时间存进来(羽毛球 1 分钟 = 2 分钟游戏)。玩游戏的时间也由家长帮你扣。
    </div>

    <div style="font-weight:600;margin:6px 2px 10px">时间流水</div>
    <div v-if="!logs.length" class="dim" style="text-align:center;padding:24px 0">还没有流水,去运动存点时间吧 🏸</div>
    <div v-for="t in logs" :key="t.id" class="card" style="display:flex;align-items:center;gap:10px;padding:11px 13px;margin-bottom:8px"
         :style="t.type==='interest' ? 'border-color:rgba(107,213,255,.3)' : ''">
      <span style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08)">{{ (META[t.type]||{}).ic }}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px">{{ (META[t.type]||{}).label }}</div>
        <div class="dim" style="font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ fmtDateTime(t.created_at) }} · {{ t.description }}</div>
      </div>
      <span style="font-weight:700" :style="t.screen_minutes>=0 ? 'color:#6bffb0' : 'color:#ff7a7a'">{{ t.screen_minutes>=0 ? '+' : '' }}{{ t.screen_minutes }}</span>
    </div>
  </div>
</template>
