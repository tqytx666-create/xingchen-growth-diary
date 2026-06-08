<script setup>
// 星币收支分析(仿时间银行收益分析):双向涨跌柱 + 来源分类 + 收支对比。数据来自 audit_logs 的 'coin' 流水。
import { computed, ref } from 'vue'
import { db } from '../../lib/store.js'
import { todayStr, weekStart } from '../../lib/util.js'
import CoinIcon from '../CoinIcon.vue'

const UP = '#ff5b5b', DOWN = '#2fcf86'   // 红涨绿跌:赚=红,花=绿
function localDay(iso) { return iso ? todayStr(new Date(iso)) : '' }

const txns = computed(() => (db.audit_logs || []).filter(l => l.target_type === 'coin').map(l => ({
  amt: (l.target_id === 'earn' ? 1 : -1) * (l.detail?.n || 0),
  reason: l.action || '', kind: l.target_id, day: localDay(l.created_at)
})).filter(t => t.amt))

const todayNet = computed(() => { const k = todayStr(); return Math.round(txns.value.filter(t => t.day === k).reduce((s, t) => s + t.amt, 0)) })
const weekNet = computed(() => { const wk = weekStart(todayStr()); return Math.round(txns.value.filter(t => t.day && weekStart(t.day) === wk).reduce((s, t) => s + t.amt, 0)) })
const totalEarn = computed(() => txns.value.filter(t => t.amt > 0).reduce((s, t) => s + t.amt, 0))
const totalSpend = computed(() => txns.value.filter(t => t.amt < 0).reduce((s, t) => s - t.amt, 0))

// 近 10 天双向柱
const days = computed(() => {
  const now = new Date(), res = []
  for (let i = 9; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const k = todayStr(d); res.push({ key: k, label: `${d.getMonth() + 1}/${d.getDate()}` }) }
  return res
})
const chart = computed(() => {
  const inc = {}, exp = {}
  for (const t of txns.value) { if (!t.day) continue; if (t.amt >= 0) inc[t.day] = (inc[t.day] || 0) + t.amt; else exp[t.day] = (exp[t.day] || 0) - t.amt }
  return days.value.map(x => ({ ...x, earn: Math.round(inc[x.key] || 0), spend: Math.round(exp[x.key] || 0) }))
})
const cmax = computed(() => Math.max(1, ...chart.value.flatMap(d => [d.earn, d.spend])))
function barH(v) { return v > 0 ? Math.max(3, Math.round(v / cmax.value * 30)) : 0 }

// 来源分类(只看赚的):打卡 / 宝箱 / 里程碑 / 其它
const sources = computed(() => {
  let dk = 0, bx = 0, ms = 0, ot = 0
  for (const t of txns.value) {
    if (t.amt <= 0) continue
    if (t.reason.includes('打卡')) dk += t.amt
    else if (t.reason.includes('宝箱') || t.reason.includes('开箱')) bx += t.amt
    else if (t.reason.includes('里程碑')) ms += t.amt
    else ot += t.amt
  }
  const arr = [
    { ic: '📚', label: '打卡赚的', val: Math.round(dk), color: '#7c6bff' },
    { ic: '🎁', label: '开宝箱', val: Math.round(bx), color: '#ffd86b' },
    { ic: '🏁', label: '里程碑', val: Math.round(ms), color: '#ff9ec7' },
    { ic: '✨', label: '其它', val: Math.round(ot), color: '#8be9ff' }
  ].filter(x => x.val > 0)
  const max = Math.max(1, ...arr.map(x => x.val))
  return arr.map(x => ({ ...x, pct: Math.round(x.val / max * 100) }))
})
const inOutMax = computed(() => Math.max(1, totalEarn.value, totalSpend.value))
const open = ref(false)
</script>

<template>
  <div class="card" style="padding:14px;margin-bottom:16px">
    <div style="display:flex;align-items:center;cursor:pointer" @click="open=!open">
      <span style="font-weight:700">📈 星币收支</span>
      <span style="display:flex;gap:7px;margin-left:auto">
        <span class="cl-chip" :style="{ color: todayNet>=0?UP:DOWN, background:(todayNet>=0?UP:DOWN)+'22' }">今日 {{ todayNet>=0?'+':'' }}{{ todayNet }}</span>
        <span class="cl-chip" :style="{ color: weekNet>=0?UP:DOWN, background:(weekNet>=0?UP:DOWN)+'22' }">本周 {{ weekNet>=0?'+':'' }}{{ weekNet }}</span>
        <span style="color:rgba(255,255,255,.4);font-size:13px">{{ open ? '▾' : '▸' }}</span>
      </span>
    </div>

    <div v-if="open" style="margin-top:14px">
      <div class="dim" style="font-size:12px;margin-bottom:10px">近 10 天 · 赚 <b :style="{color:UP}">+{{ chart.reduce((s,d)=>s+d.earn,0) }}</b> · 花 <b :style="{color:DOWN}">-{{ chart.reduce((s,d)=>s+d.spend,0) }}</b> 星币</div>
      <!-- 双向涨跌柱 -->
      <div class="cl-chart">
        <div v-for="d in chart" :key="d.key" class="cl-col">
          <div class="cl-up">
            <b v-if="d.earn" class="cl-num" :style="{color:UP}">+{{ d.earn }}</b>
            <span class="cl-bar" :style="{ height: barH(d.earn)+'px', background: UP, borderRadius:'4px 4px 0 0' }"></span>
          </div>
          <div class="cl-base"></div>
          <div class="cl-down">
            <span class="cl-bar" :style="{ height: barH(d.spend)+'px', background: DOWN, borderRadius:'0 0 4px 4px' }"></span>
            <b v-if="d.spend" class="cl-num" :style="{color:DOWN}">-{{ d.spend }}</b>
          </div>
          <div class="cl-lb">{{ d.label }}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin:8px 0 4px;font-size:11px">
        <span><i class="cl-dot" style="background:#ff5b5b"></i> 赚到</span>
        <span><i class="cl-dot" style="background:#2fcf86"></i> 花掉</span>
      </div>

      <!-- 来源分类 -->
      <div v-if="sources.length" style="margin-top:12px">
        <div class="dim" style="font-size:12px;margin-bottom:8px">星币都从哪赚的:</div>
        <div v-for="s in sources" :key="s.label" style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>{{ s.ic }} {{ s.label }}</span><span style="font-weight:700" :style="{color:s.color}">{{ s.val }}</span></div>
          <div class="cl-track"><i :style="{ width:s.pct+'%', background:s.color }"></i></div>
        </div>
      </div>

      <!-- 收支对比 -->
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>📥 总赚到</span><span style="font-weight:700" :style="{color:UP}">+{{ totalEarn }}</span></div>
        <div class="cl-track"><i :style="{ width:(totalEarn/inOutMax*100)+'%', background:UP }"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin:8px 0 4px"><span>🛍️ 总花掉</span><span style="font-weight:700" :style="{color:DOWN}">-{{ totalSpend }}</span></div>
        <div class="cl-track"><i :style="{ width:(totalSpend/inOutMax*100)+'%', background:DOWN }"></i></div>
        <div class="dim" style="font-size:12px;text-align:center;margin-top:10px">攒下 <b style="color:#ffd86b"><CoinIcon /> {{ totalEarn - totalSpend }}</b> 星币</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cl-chip { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
.cl-chart { display: flex; gap: 3px; }
.cl-col { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
.cl-up { height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.cl-down { height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
.cl-base { height: 1px; width: 100%; background: rgba(255,255,255,.2); }
.cl-bar { width: 62%; max-width: 16px; flex: none; transition: height .4s ease; }
.cl-num { font-size: 10px; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.5); }
.cl-lb { font-size: 9px; color: rgba(255,255,255,.5); margin-top: 2px; white-space: nowrap; }
.cl-dot { display: inline-block; width: 9px; height: 9px; border-radius: 2px; vertical-align: 0; }
.cl-track { height: 8px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.cl-track i { display: block; height: 100%; border-radius: 999px; transition: width .6s cubic-bezier(.2,1,.4,1); }
</style>
