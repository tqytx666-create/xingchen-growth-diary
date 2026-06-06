<script setup>
import { ref, computed } from 'vue'
import { db } from '../../lib/store.js'
const props = defineProps({ embed: { type: Boolean, default: false } })
import { todayStr } from '../../lib/util.js'
import { requestMakeup } from '../../services/checkinService.js'
import { toast } from '../../lib/toast.js'

const cursor = ref(new Date())
const ym = computed(() => ({ y: cursor.value.getFullYear(), m: cursor.value.getMonth() }))
const today = todayStr()
const activeTasks = computed(() => db.tasks.filter(t => t.is_active))

// 每天每个任务的状态:done / false / none
function statusOn(taskId, date) {
  const c = db.checkins.find(x => x.task_id === taskId && x.checkin_date === date && x.status !== 'revoked')
  if (!c) return 'none'
  if (c.status === 'false_reported') return 'false'
  if (c.status === 'self_reported') return 'wait'
  return 'done'   // confirmed
}
// 当天完成数(confirmed/self_reported,非虚报)
function doneCount(date) {
  return activeTasks.value.filter(t => ['done', 'wait'].includes(statusOn(t.id, date))).length
}
// 当天是否有"英语主线"打卡(主线 or 外教课)——有则给金边,跟周签到呼应
const mainTaskIds = computed(() => new Set(db.tasks.filter(t => t.task_type === 'main' || t.lesson).map(t => t.id)))
function mainDoneOn(date) {
  return [...mainTaskIds.value].some(id => ['done', 'wait'].includes(statusOn(id, date)))
}

const grid = computed(() => {
  const { y, m } = ym.value
  const first = new Date(y, m, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ d, ds, n: doneCount(ds), main: mainDoneOn(ds), today: ds === today, future: ds > today })
  }
  return cells
})
// 热力色:完成越多越亮(0→暗,5+→金黄,跟周签到的金色呼应)
function heat(n) {
  if (n <= 0) return 'rgba(255,255,255,.05)'
  const lv = Math.min(n, 5) / 5
  return `rgba(255,201,64,${0.2 + lv * 0.66})`
}
function move(n) { const c = new Date(cursor.value); c.setMonth(c.getMonth() + n); cursor.value = c }

// 选中某天看详情 + 补卡
const sel = ref(null)
function openDay(c) { if (c) sel.value = c.ds }
const selFuture = computed(() => !!sel.value && sel.value > today)
const selTasks = computed(() => activeTasks.value.map(t => ({ ...t, st: statusOn(t.id, sel.value) })))
function makeUp(t) {
  try { requestMakeup(t.id, sel.value); toast(`已申请补卡:${t.name} 📅 等家长核验`) }
  catch (e) { toast(e.message) }
}
function fmtSel(d) { if (!d) return ''; const p = d.split('-'); return `${+p[1]}月${+p[2]}日` }
</script>

<template>
  <div :style="embed ? '' : 'padding:14px 14px 90px'">
    <h2 v-if="!embed" style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">📅 打卡日历</h2>
    <div class="card" style="padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <button class="btn-ghost" style="padding:6px 12px" @click="move(-1)">‹</button>
        <span style="font-weight:700">{{ ym.y }} 年 {{ ym.m + 1 }} 月</span>
        <button class="btn-ghost" style="padding:6px 12px" @click="move(1)">›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center;font-size:11px;color:rgba(255,255,255,.5);margin-bottom:6px">
        <div v-for="d in ['一','二','三','四','五','六','日']" :key="d">{{ d }}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">
        <button v-for="(c,i) in grid" :key="i" class="day"
                :disabled="!c" :style="c ? { background: heat(c.n), border: c.today ? '2px solid #fff' : (c.main ? '2px solid #ffd86b' : '1px solid transparent'), boxShadow: (c.main && !c.today) ? '0 0 7px -1px rgba(255,216,107,.8)' : 'none' } : { background:'transparent' }"
                @click="openDay(c)">
          <template v-if="c">
            <span :style="c.today ? 'color:#fff;font-weight:700' : (c.n>2 ? 'color:#5a3d00;font-weight:700' : 'color:rgba(255,255,255,.7)')">{{ c.d }}</span>
            <span v-if="c.n>0" style="font-size:8px;line-height:1" :style="c.n>2 ? 'color:#5a3d00' : 'color:rgba(255,255,255,.6)'">{{ c.n }}项</span>
          </template>
        </button>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px;font-size:11px;color:rgba(255,255,255,.5)">
        <span>少</span>
        <span v-for="n in [0,1,2,3,5]" :key="n" style="width:14px;height:14px;border-radius:4px" :style="{ background: heat(n) }"></span>
        <span>多</span>
      </div>
      <div style="text-align:center;margin-top:7px;font-size:11px;color:rgba(255,255,255,.5)">
        <span style="display:inline-block;width:11px;height:11px;border-radius:3px;border:2px solid #ffd86b;vertical-align:-1px;margin-right:3px"></span>金边=当天打了英语主线 · 点某天可补卡
      </div>
    </div>

    <!-- 某天详情 + 补卡 -->
    <div v-if="sel" class="day-overlay" @click.self="sel=null">
      <div class="day-sheet">
        <div style="font-size:17px;font-weight:700;margin-bottom:4px">📅 {{ fmtSel(sel) }}{{ sel===today ? ' · 今天' : '' }}</div>
        <div class="dim" style="font-size:12px;margin-bottom:12px">{{ selFuture ? '这天还没到,到那天再来打卡呀 ✨' : '没打的任务可以「补卡」,补卡要家长核验才算数。' }}</div>
        <div v-for="t in selTasks" :key="t.id" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08)">
          <span style="font-size:20px">{{ t.icon }}</span>
          <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">{{ t.name }}</div></div>
          <span v-if="t.st==='done'" style="font-size:12px;color:#6bffb0">✅ 已完成</span>
          <span v-else-if="t.st==='wait'" style="font-size:12px;color:#ffd86b">⏳ 待核验</span>
          <span v-else-if="t.st==='false'" style="font-size:12px;color:#ff7a7a">⚠️ 虚报</span>
          <span v-else-if="selFuture" style="font-size:12px;color:rgba(255,255,255,.35)">— 未到</span>
          <button v-else class="btn-ghost" style="padding:6px 12px;font-size:12px;border-color:rgba(124,107,255,.4);color:#c3b8ff" @click="makeUp(t)">补卡</button>
        </div>
        <button class="btn-accent" style="width:100%;margin-top:14px;padding:11px" @click="sel=null">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.day { aspect-ratio: .9; border-radius: 9px; padding: 3px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; transition: transform .1s; }
.day:active:not(:disabled) { transform: scale(.92); }
.day:disabled { cursor: default; }
.day-overlay { position: fixed; inset: 0; z-index: 70; display: grid; place-items: end center;
  background: rgba(6,4,16,.7); backdrop-filter: blur(3px); animation: af .2s ease; }
.day-sheet { width: 100%; max-width: 460px; background: #14111f; border: 1px solid rgba(255,255,255,.12);
  border-radius: 22px 22px 0 0; padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0,0,0,.4); animation: su .28s cubic-bezier(.2,1,.4,1); }
@keyframes af { from { opacity: 0 } to { opacity: 1 } }
@keyframes su { from { transform: translateY(100%) } to { transform: translateY(0) } }
</style>
