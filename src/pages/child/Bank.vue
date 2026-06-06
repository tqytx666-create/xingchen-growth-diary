<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { db, bank } from '../../lib/store.js'
import { fmtDateTime } from '../../lib/util.js'

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
    { key: 'deposit', label: '运动存入', ic: '🏃', val: Math.round(s.dep), color: '#6bffb0' },
    { key: 'interest', label: '利息(复利)', ic: '💎', val: Math.round(s.intr), color: '#8be9ff' },
    { key: 'bonus', label: '奖励 / 宝箱', ic: '🎁', val: Math.round(s.bon), color: '#ffd86b' }
  ].filter(x => x.val > 0)
  const max = Math.max(1, ...arr.map(x => x.val))
  return arr.map(x => ({ ...x, pct: Math.round(x.val / max * 100) }))
})
const inOutMax = computed(() => Math.max(1, stat.value.totalIn, stat.value.totalOut))

// 近 7 天每日净增减(绿涨红跌,像股票)
const days7 = computed(() => {
  const map = {}
  for (const t of txns.value) { const d = (t.created_at || '').slice(0, 10); if (d) map[d] = (map[d] || 0) + (t.screen_minutes || 0) }
  const arr = [], now = new Date()
  const wd = ['日', '一', '二', '三', '四', '五', '六']
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(now); dt.setDate(now.getDate() - i)
    const ds = dt.toISOString().slice(0, 10)
    arr.push({ ds, label: wd[dt.getDay()], today: i === 0, net: Math.round(map[ds] || 0) })
  }
  return arr
})
const maxAbs = computed(() => Math.max(1, ...days7.value.map(d => Math.abs(d.net))))
const todayNet = computed(() => days7.value[6]?.net || 0)
const weekNet = computed(() => days7.value.reduce((s, d) => s + d.net, 0))
function barH(net) { return Math.max(2, Math.round(Math.abs(net) / maxAbs.value * 34)) }
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
        <span class="chip" :class="todayNet>=0 ? 'up' : 'down'">今日 {{ fmtNet(todayNet) }}</span>
        <span class="chip" :class="weekNet>=0 ? 'up' : 'down'">本周 {{ fmtNet(weekNet) }}</span>
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

    <!-- 收支对比 -->
    <div class="card" style="padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:12px">📊 总收入 vs 总支出</div>
      <div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>📥 总赚到</span><span style="color:#6bffb0;font-weight:700">+{{ stat.totalIn.toFixed(0) }} 分</span></div>
        <div class="track"><i :style="{ width: (stat.totalIn/inOutMax*100)+'%', background:'#6bffb0' }"></i></div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>🎮 总花掉</span><span style="color:#ff7a7a;font-weight:700">-{{ stat.totalOut.toFixed(0) }} 分</span></div>
        <div class="track"><i :style="{ width: (stat.totalOut/inOutMax*100)+'%', background:'#ff7a7a' }"></i></div>
      </div>
      <div class="dim" style="font-size:12px;text-align:center;margin-top:12px">净结余 <b :style="{color: stat.net>=0 ? '#6bffb0':'#ff7a7a'}">{{ fmtNet(stat.net.toFixed(0)) }}</b> 分钟</div>
    </div>

    <!-- 近7天趋势 -->
    <div class="card" style="padding:16px 14px;margin-bottom:14px">
      <div style="font-weight:700;margin-bottom:14px">📈 近 7 天每天涨跌</div>
      <div class="chart7">
        <div v-for="d in days7" :key="d.ds" class="col">
          <div class="bars">
            <span class="bar" :class="d.net>=0 ? 'up' : 'down'" :style="{ height: barH(d.net)+'px' }"></span>
          </div>
          <div class="net" :style="{ color: d.net>0 ? '#6bffb0' : (d.net<0 ? '#ff7a7a' : 'rgba(255,255,255,.35)') }">{{ d.net===0 ? '·' : fmtNet(d.net) }}</div>
          <div class="wd" :class="{ today: d.today }">{{ d.label }}</div>
        </div>
      </div>
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
      <span style="font-weight:700" :style="t.screen_minutes>=0 ? 'color:#6bffb0' : 'color:#ff7a7a'">{{ t.screen_minutes>=0 ? '+' : '' }}{{ t.screen_minutes }}</span>
    </div>
  </div>
</template>

<style scoped>
.chip { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; }
.chip.up { color: #6bffb0; background: rgba(107,255,176,.15); }
.chip.down { color: #ff7a7a; background: rgba(255,122,122,.15); }
.hl { border-color: rgba(107,213,255,.4); background: linear-gradient(160deg, rgba(107,213,255,.12), rgba(255,255,255,.04)); }
.track { height: 9px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.track i { display: block; height: 100%; border-radius: 999px; transition: width .6s cubic-bezier(.2,1,.4,1); }
.chart7 { display: flex; gap: 4px; }
.col { flex: 1; display: flex; flex-direction: column; align-items: center; }
.bars { height: 38px; width: 100%; display: flex; align-items: flex-end; justify-content: center; border-bottom: 1px solid rgba(255,255,255,.12); }
.bar { width: 60%; max-width: 22px; border-radius: 4px 4px 0 0; }
.bar.up { background: linear-gradient(180deg, #6bffb0, #3bd98c); }
.bar.down { background: linear-gradient(180deg, #ff9a9a, #ff6b6b); }
.net { font-size: 10px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
.wd { font-size: 11px; color: rgba(255,255,255,.5); margin-top: 1px; }
.wd.today { color: #ffd86b; font-weight: 700; }
</style>
