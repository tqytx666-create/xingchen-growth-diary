<script setup>
import { ref, computed } from 'vue'
import { db, child } from '../../lib/store.js'
import { todayStr } from '../../lib/util.js'

const cursor = ref(new Date())
const ym = computed(() => ({ y: cursor.value.getFullYear(), m: cursor.value.getMonth() }))

const byDate = computed(() => {
  const map = {}
  for (const c of db.checkins) {
    if (c.status === 'revoked') continue
    map[c.checkin_date] = map[c.checkin_date] || []
    const t = db.tasks.find(t => t.id === c.task_id)
    map[c.checkin_date].push({ icon: t?.icon, main: t?.task_type === 'main', false: c.status === 'false_reported' })
  }
  return map
})

const grid = computed(() => {
  const { y, m } = ym.value
  const first = new Date(y, m, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ d, ds, items: byDate.value[ds] || [], today: ds === todayStr() })
  }
  return cells
})
function move(n) { const c = new Date(cursor.value); c.setMonth(c.getMonth() + n); cursor.value = c }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">📅 我的日历</h2>
    <div class="card" style="padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <button class="btn-ghost" style="padding:6px 12px" @click="move(-1)">‹</button>
        <span style="font-weight:700">{{ ym.y }} 年 {{ ym.m + 1 }} 月</span>
        <button class="btn-ghost" style="padding:6px 12px" @click="move(1)">›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;font-size:11px;color:rgba(255,255,255,.5);margin-bottom:6px">
        <div v-for="d in ['一','二','三','四','五','六','日']" :key="d">{{ d }}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
        <div v-for="(c,i) in grid" :key="i" style="aspect-ratio:.82;border-radius:8px;padding:3px;font-size:10px;display:flex;flex-direction:column;align-items:center"
             :style="c ? (c.today ? 'background:rgba(255,216,107,.2);border:1px solid #ffd86b' : 'background:rgba(255,255,255,.05)') : ''">
          <template v-if="c">
            <div :style="c.today ? 'color:#ffd86b;font-weight:700' : 'color:rgba(255,255,255,.6)'">{{ c.d }}</div>
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1px;font-size:9px;line-height:1">
              <span v-for="(it,j) in c.items.slice(0,4)" :key="j" :style="it.false ? 'opacity:.35' : ''">{{ it.icon }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div class="dim" style="font-size:12px;margin-top:12px;text-align:center">图标 = 当天完成的任务,淡色 = 被标记虚报</div>
  </div>
</template>
