<script setup>
import { computed } from 'vue'
import { db, streak, mainTask } from '../../lib/store.js'
import { weeklyProgress, nextCumulative } from '../../services/streakService.js'
import { todayStr, addDays } from '../../lib/util.js'
import { REWARDS } from '../../lib/rewardConfig.js'

const wp = computed(() => weeklyProgress())
const nc = computed(() => nextCumulative())
const ws = computed(() => streak().current_week_start)

const weekDays = computed(() => {
  const mt = mainTask()
  const done = new Set(db.checkins.filter(c => c.task_id === mt.id && c.status !== 'false_reported' && c.status !== 'revoked').map(c => c.checkin_date))
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  return labels.map((l, i) => { const d = addDays(ws.value, i); return { l, date: d, done: done.has(d), today: d === todayStr(), future: d > todayStr() } })
})

// 累积成就徽章:直接复用奖励页同一份配置(按连续签到 streak 的里程碑),保证名称/天数一致
const badges = computed(() =>
  REWARDS.filter(r => r.metric === 'streak')
    .sort((a, b) => a.target - b.target)
    .map(r => ({ d: r.target, icon: r.icon, name: r.name, got: nc.value.longest >= r.target }))
)
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">🔥 英语主线签到</h2>

    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
        <span style="font-weight:600">本周完成</span>
        <span style="font-size:24px;font-weight:800;color:#ffd86b">{{ wp.count }}<span class="dim" style="font-size:14px">/7 天</span></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:7px">
        <div v-for="d in weekDays" :key="d.date" class="day-cell" :class="{ today: d.today && !d.done }"
             style="aspect-ratio:1;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;transition:all .3s"
             :style="d.done ? 'background:linear-gradient(160deg,rgba(255,216,107,.3),rgba(255,179,71,.15));border:1px solid #ffd86b;color:#ffd86b;font-weight:700' : (d.future ? 'background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.35)' : 'background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5)')">
          <div>周{{ d.l }}</div>
          <div style="font-size:17px;line-height:1.1;margin-top:1px">{{ d.done ? '🐾' : (d.today ? '⭐' : (d.future ? '·' : '–')) }}</div>
        </div>
      </div>
    </div>

    <!-- 累积成就徽章 -->
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:4px">🏅 累积成就(长期大奖)</div>
      <div class="dim" style="font-size:11px;margin-bottom:12px">连续签到达成里程碑 → 到「🎁奖励」页申请,家长确认后兑现</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        <div v-for="m in badges" :key="m.d" style="text-align:center;padding:10px 4px;border-radius:14px;transition:all .3s"
             :style="m.got ? 'background:linear-gradient(160deg,rgba(255,216,107,.2),rgba(255,255,255,.06));border:1px solid rgba(255,216,107,.5)' : 'background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08)'">
          <div style="font-size:30px" :style="m.got ? '' : 'filter:grayscale(1);opacity:.4'">{{ m.icon }}</div>
          <div style="font-size:11px;margin-top:4px" :style="m.got ? 'color:#ffd86b;font-weight:700' : 'color:rgba(255,255,255,.4)'">{{ m.name }}</div>
          <div class="dim" style="font-size:10px;margin-top:1px">{{ m.d }} 天{{ m.got ? ' ✓' : '' }}</div>
        </div>
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:4px">⚡ 本周小奖励(自动到账)</div>
      <div class="dim" style="font-size:11px;margin-bottom:12px">本周英语坚持到这些天数,游戏时间自动发到时间银行,无需申请</div>
      <div v-for="r in wp.rules" :key="r.required_days" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <span style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700"
              :style="wp.count>=r.required_days ? 'background:#6bffb0;color:#0a3d28' : 'background:rgba(255,255,255,.1)'">{{ wp.count>=r.required_days ? '✓' : r.required_days }}</span>
        <span style="flex:1;font-size:14px" :class="{ dim: wp.count < r.required_days }">满 {{ r.required_days }} 天:{{ r.reward_name }}</span>
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:10px">累积签到</div>
      <div style="display:flex;justify-content:space-around;text-align:center">
        <div><div style="font-size:26px;font-weight:800;color:#ffd86b">{{ nc.current }}</div><div class="dim" style="font-size:11px">当前连续</div></div>
        <div><div style="font-size:26px;font-weight:800">{{ nc.longest }}</div><div class="dim" style="font-size:11px">历史最长</div></div>
        <div><div style="font-size:26px;font-weight:800">{{ nc.total }}</div><div class="dim" style="font-size:11px">累积天数</div></div>
      </div>
      <div v-if="nc.next" class="dim" style="font-size:13px;text-align:center;margin-top:12px">
        距离「{{ nc.next.reward_name }}」还差 <b style="color:#ffd86b">{{ nc.next.streak - nc.current }}</b> 天
      </div>
    </div>

    <div class="card" style="padding:14px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.7)">
      📵 家庭规则:如果英语某天没完成,系统会记录「手机收回三天」提醒。是否执行由家人决定,断签不会让宠物死亡,只会低落和影响进化。
    </div>
  </div>
</template>

<style scoped>
.day-cell.today { animation: todayPulse 1.6s ease-in-out infinite; }
@keyframes todayPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,216,107,.4);} 50%{box-shadow:0 0 0 4px rgba(255,216,107,.12);} }
</style>
