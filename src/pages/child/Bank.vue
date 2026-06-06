<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { db, bank } from '../../lib/store.js'
import { fmtDateTime, weekStart } from '../../lib/util.js'

// 中国股市习惯:红涨绿跌(增=红,减=绿)
const UP = '#ff5b5b', DOWN = '#2fcf86'

const b = computed(() => bank())
const txns = computed(() => db.time_bank_transactions || [])
const logs = computed(() => txns.value.slice(0, 80))
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

// ---- 统计 ----
const stat = computed(() => {
  let dep = 0, bon = 0, intr = 0, wd = 0, pen = 0
  for (const t of txns.value) {
    const m = t.screen_minutes || 0
    if (t.type === 'deposit') dep += m
    else if (t.type === 'bonus') bon += m
    else if (t.type === 'interest') intr += m
    else if (t.type === 'withdraw') wd += -m
    else if (t.type === 'penalty') pen += -m
  }
  const totalIn = dep + bon + intr, totalOut = wd + pen
  return { dep, bon, intr, wd, pen, totalIn, totalOut, net: totalIn - totalOut }
})
const sources = computed(() => {
  const s = stat.value
  const arr = [
    { key: 'deposit', label: '运动存入', ic: '🏃', val: Math.round(s.dep), color: '#c08bff' },
    { key: 'interest', label: '利息(复利)', ic: '💎', val: Math.round(s.intr), color: '#8be9ff' },
    { key: 'bonus', label: '奖励 / 宝箱', ic: '🎁', val: Math.round(s.bon), color: '#ffd86b' }
  ].filter(x => x.val > 0)
  const max = Math.max(1, ...arr.map(x => x.val))
  return arr.map(x => ({ ...x, pct: Math.round(x.val / max * 100) }))
})
const inOutMax = computed(() => Math.max(1, stat.value.totalIn, stat.value.totalOut))

// ---- 收益分析:日/月/年 切换的涨跌行情图 ----
const range = ref('day')   // day / week / month
function pad(n) { return String(n).padStart(2, '0') }
function bucketDefs(r) {
  const now = new Date(), res = []
  if (r === 'day') {
    for (let i = 9; i >= 0; i--) { const dt = new Date(now); dt.setDate(now.getDate() - i); res.push({ key: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, label: `${dt.getMonth() + 1}/${dt.getDate()}` }) }
  } else if (r === 'week') {
    for (let i = 7; i >= 0; i--) { const dt = new Date(now); dt.setDate(now.getDate() - i * 7); const ws = weekStart(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`); const p = ws.split('-'); res.push({ key: ws, label: `${+p[1]}/${+p[2]}` }) }
  } else {
    for (let i = 5; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); res.push({ key: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`, label: `${dt.getMonth() + 1}月` }) }
  }
  return res
}
function bucketKey(dateStr, r) {
  if (r === 'day') return dateStr
  if (r === 'week') return weekStart(dateStr)
  return dateStr.slice(0, 7)
}
const chartData = computed(() => {
  const defs = bucketDefs(range.value)
  const sum = {}
  for (const t of txns.value) { const d = (t.created_at || '').slice(0, 10); if (!d) continue; const k = bucketKey(d, range.value); sum[k] = (sum[k] || 0) + (t.screen_minutes || 0) }
  return defs.map(x => ({ ...x, net: Math.round(sum[x.key] || 0) }))
})
const chartMax = computed(() => Math.max(1, ...chartData.value.map(d => Math.abs(d.net))))
const rangeTotal = computed(() => chartData.value.reduce((s, d) => s + d.net, 0))
const rangeLabel = computed(() => ({ day: '近 10 天', week: '近 8 周', month: '近 6 个月' }[range.value]))
function barH(net) { return Math.max(2, Math.round(Math.abs(net) / chartMax.value * 40)) }

// 今日 / 本周净增减(顶部)
const todayNet = computed(() => { const k = (new Date()).toISOString().slice(0, 10); let s = 0; for (const t of txns.value) if ((t.created_at || '').slice(0, 10) === k) s += t.screen_minutes || 0; return Math.round(s) })
const weekNet = computed(() => { const wk = weekStart((new Date()).toISOString().slice(0, 10)); let s = 0; for (const t of txns.value) { const d = (t.created_at || '').slice(0, 10); if (d && weekStart(d) === wk) s += t.screen_minutes || 0 } return Math.round(s) })
function fmtNet(n) { return (Number(n) >= 0 ? '+' : '') + n }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">⏱️ 时间银行</h2>

    <!-- 余额 -->
    <div class="card" style="text-align:center;padding:22px;margin-bottom:12px;background:linear-gradient(160deg,rgba(124,107,255,.22),rgba(255,255,255,.06))">
      <div style="font-size:48px;font-weight:800;color:#ffd86b;line-height:1;font-variant-numeric:tabular-nums">{{ display }}</div>
      <div class="dim" style="font-size:13px;margin-top:4px">分钟 · 约 {{ Math.floor(display/60) }} 小时 {{ display%60 }} 分钟可玩</div>
      <div style="display:flex;justify-content:center;gap:8px;margin-top:12px">
        <span class="chip" :style="{ color: todayNet>=0?UP:DOWN, background: (todayNet>=0?UP:DOWN)+'26' }">今日 {{ fmtNet(todayNet) }}</span>
        <span class="chip" :style="{ color: weekNet>=0?UP:DOWN, background: (weekNet>=0?UP:DOWN)+'26' }">本周 {{ fmtNet(weekNet) }}</span>
      </div>
    </div>

    <!-- 复利威力 -->
    <div class="card hl" style="padding:16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:20px">💎</span><span style="font-weight:700">复利的威力</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,.8);line-height:1.6">
        到现在,利息已经悄悄帮你赚了 <b style="color:#9fe4ff;font-size:18px">{{ stat.intr.toFixed(0) }}</b> 分钟,什么都没做!<br>
        余额每天 <b style="color:#9fe4ff">+1%</b> 自动滚雪球 —— <b>余额越多,利息越多</b>。存着不花,时间会自己变多 ✨
      </div>
    </div>

    <!-- 收益分析:日/月/年 行情图 -->
    <div class="card" style="padding:16px 14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;margin-bottom:4px">
        <span style="font-weight:700">📈 收益分析</span>
        <div class="seg">
          <button :class="{ on: range==='day' }" @click="range='day'">日</button>
          <button :class="{ on: range==='week' }" @click="range='week'">周</button>
          <button :class="{ on: range==='month' }" @click="range='month'">月</button>
        </div>
      </div>
      <div class="dim" style="font-size:12px;margin-bottom:12px">{{ rangeLabel }}净收益 <b :style="{ color: rangeTotal>=0?UP:DOWN }">{{ fmtNet(rangeTotal) }}</b> 分钟</div>
      <div class="chart">
        <div v-for="d in chartData" :key="d.key" class="col">
          <div class="bars">
            <span class="bar" :style="{ height: barH(d.net)+'px', background: d.net>=0?UP:DOWN }"></span>
          </div>
          <div class="net" :style="{ color: d.net>0?UP:(d.net<0?DOWN:'rgba(255,255,255,.3)') }">{{ d.net===0 ? '·' : fmtNet(d.net) }}</div>
          <div class="lb">{{ d.label }}</div>
        </div>
      </div>
    </div>

    <!-- 收入来源 -->
    <div v-if="sources.length" class="card" style="padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:12px">📥 时间都从哪来(看看哪个最有效)</div>
      <div v-for="s in sources" :key="s.key" style="margin-bottom:11px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
          <span>{{ s.ic }} {{ s.label }}</span><span style="font-weight:700" :style="{color:s.color}">{{ s.val }} 分</span>
        </div>
        <div class="track"><i :style="{ width: s.pct+'%', background: s.color }"></i></div>
      </div>
    </div>

    <!-- 收支对比(红收入 / 绿支出) -->
    <div class="card" style="padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:12px">📊 总收入 vs 总支出</div>
      <div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>📥 总赚到</span><span style="font-weight:700" :style="{color:UP}">+{{ stat.totalIn.toFixed(0) }} 分</span></div>
        <div class="track"><i :style="{ width: (stat.totalIn/inOutMax*100)+'%', background:UP }"></i></div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>🎮 总花掉</span><span style="font-weight:700" :style="{color:DOWN}">-{{ stat.totalOut.toFixed(0) }} 分</span></div>
        <div class="track"><i :style="{ width: (stat.totalOut/inOutMax*100)+'%', background:DOWN }"></i></div>
      </div>
      <div class="dim" style="font-size:12px;text-align:center;margin-top:12px">净结余 <b :style="{color: stat.net>=0?UP:DOWN}">{{ fmtNet(stat.net.toFixed(0)) }}</b> 分钟</div>
    </div>

    <div class="card" style="padding:12px 13px;margin-bottom:14px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.72)">
      💡 想让时间变多?① 多运动让家长存入(羽毛球 1 分钟 = 2 分钟游戏)② 攒着别急着花,吃复利利息 ③ 完成打卡开宝箱、收每日利息。
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
      <span style="font-weight:700" :style="{ color: t.screen_minutes>=0 ? UP : DOWN }">{{ t.screen_minutes>=0 ? '+' : '' }}{{ t.screen_minutes }}</span>
    </div>
  </div>
</template>

<style scoped>
.chip { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; }
.hl { border-color: rgba(107,213,255,.4); background: linear-gradient(160deg, rgba(107,213,255,.12), rgba(255,255,255,.04)); }
.track { height: 9px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.track i { display: block; height: 100%; border-radius: 999px; transition: width .6s cubic-bezier(.2,1,.4,1); }
/* 日/周/月 切换 */
.seg { margin-left: auto; display: flex; background: rgba(255,255,255,.08); border-radius: 999px; padding: 2px; }
.seg button { border: none; background: transparent; color: rgba(255,255,255,.6); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; cursor: pointer; }
.seg button.on { background: linear-gradient(90deg,#ffd86b,#ffb347); color: #1a1426; }
/* 行情柱状图 */
.chart { display: flex; gap: 3px; align-items: flex-end; }
.col { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
.bars { height: 44px; width: 100%; display: flex; align-items: flex-end; justify-content: center; border-bottom: 1px solid rgba(255,255,255,.12); }
.bar { width: 64%; max-width: 20px; border-radius: 4px 4px 0 0; transition: height .4s ease; }
.net { font-size: 9px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lb { font-size: 10px; color: rgba(255,255,255,.5); margin-top: 1px; white-space: nowrap; }
</style>
