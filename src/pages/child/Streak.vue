<script setup>
import { computed } from 'vue'
import { db, streak, mainTask, child } from '../../lib/store.js'
import { weeklyProgress, nextCumulative, missedMainDays, isMainStreakTask } from '../../services/streakService.js'
import { ownedFreezeCards } from '../../services/rewardService.js'
import { makeUpMissedDay } from '../../services/checkinService.js'
import { todayStr, addDays } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'
import { STREAK_MILESTONES, BOX_LABEL } from '../../lib/rewardConfig.js'
import CountUp from '../../components/CountUp.vue'
import CoinIcon from '../../components/CoinIcon.vue'
import Calendar from './Calendar.vue'

const wp = computed(() => weeklyProgress())
const nc = computed(() => nextCumulative())
// 火花拉满:连续越久火越大、火星越多
const flameSize = computed(() => Math.round(Math.min(96, 44 + (nc.value.current || 0) * 3)))   // 44→封顶96
const emberCount = computed(() => Math.min(8, Math.floor((nc.value.current || 0) / 3)))          // 每3天多一颗火星,最多8
const flameTier = computed(() => { const c = nc.value.current || 0; return c >= 21 ? ' · 🔥燎原之火!' : c >= 14 ? ' · 🔥旺火' : c >= 7 ? ' · 🔥渐旺' : c >= 3 ? ' · 火苗渐起' : '' })
function emberStyle(i) {
  const left = 12 + (i * 73 % 70), delay = (i * 0.37 % 2.2).toFixed(2), dur = (1.6 + (i % 3) * 0.5).toFixed(2)
  return { left: left + '%', animationDelay: delay + 's', animationDuration: dur + 's' }
}
const ws = computed(() => streak().current_week_start)

// 补卡:本周漏打的英语日 + 持有的免断签卡
const missed = computed(() => missedMainDays())
const cards = computed(() => ownedFreezeCards())
function fmtMd(d) { const p = d.split('-'); return `${+p[1]}月${+p[2]}日` }
function makeUp(date) {
  try {
    makeUpMissedDay(date, child().id)
    toast('补卡成功!用掉 1 张免断签卡,连续天数接上啦 🛡️')
  } catch (e) { toast(e.message) }
}

// 里程碑路线图:7/14/21/30 天奖励,标 已达成/进行中(带进度)/未解锁
const roadmap = computed(() => {
  const s = streak()
  const claimed = new Set(s.milestones_claimed || [])
  const cur = s.current_streak || 0
  let activeFound = false
  return STREAK_MILESTONES.map(m => {
    let state
    if (claimed.has(m.days)) state = 'done'
    else if (!activeFound) { state = 'active'; activeFound = true }
    else state = 'locked'
    return { ...m, state, daysLeft: Math.max(0, m.days - cur), pct: Math.min(100, Math.round(cur / m.days * 100)), boxName: BOX_LABEL[m.box] }
  })
})

const weekDays = computed(() => {
  const ids = new Set(db.tasks.filter(isMainStreakTask).map(t => t.id))
  const done = new Set(db.checkins.filter(c => ids.has(c.task_id) && c.status !== 'false_reported' && c.status !== 'revoked').map(c => c.checkin_date))
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  return labels.map((l, i) => { const d = addDays(ws.value, i); return { l, date: d, done: done.has(d), today: d === todayStr(), future: d > todayStr() } })
})

</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">🔥 英语主线签到</h2>

    <!-- 连续签到 Hero:页面最重要的情绪指标,放最前最醒目 -->
    <div class="card streak-hero" style="margin-bottom:16px">
      <div class="hero-row">
        <div class="flame-wrap" :style="{ width: flameSize+'px', height: flameSize+'px' }">
          <div class="flame fx-flamebob" :style="{ fontSize: flameSize+'px' }">🔥</div>
          <span v-for="e in emberCount" :key="e" class="ember" :style="emberStyle(e)"></span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="hero-num"><CountUp :value="nc.current" /> <span class="hero-unit">天</span></div>
          <div class="hero-cur">当前连续英语签到{{ flameTier }}</div>
        </div>
        <div class="hero-side">
          <div>🏆 最长 <b>{{ nc.longest }}</b></div>
          <div>📚 累积 <b>{{ nc.total }}</b></div>
        </div>
      </div>

      <div v-if="nc.next" class="hero-next">距离「{{ nc.next.reward_name }}」还差 <b>{{ nc.next.streak - nc.current }}</b> 天 · 加油 ✨</div>

      <div class="hero-weekhead">
        <span style="font-weight:600">本周完成</span>
        <span><b style="color:#ffd86b;font-size:19px">{{ wp.count }}</b><span class="dim" style="font-size:13px"> /7 天</span></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin-top:9px">
        <div v-for="d in weekDays" :key="d.date" class="day-cell" :class="{ today: d.today && !d.done }"
             style="aspect-ratio:1;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;transition:all .3s"
             :style="d.done ? 'background:linear-gradient(160deg,rgba(255,216,107,.3),rgba(255,179,71,.15));border:1px solid #ffd86b;color:#ffd86b;font-weight:700' : (d.future ? 'background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.35)' : 'background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5)')">
          <div>周{{ d.l }}</div>
          <div style="font-size:17px;line-height:1.1;margin-top:1px">{{ d.done ? '🐾' : (d.today ? '⭐' : (d.future ? '·' : '–')) }}</div>
        </div>
      </div>
    </div>

    <!-- 里程碑路线图:坚持越久,奖励越大 -->
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:4px">🏁 坚持里程碑(连续英语签到)</div>
      <div class="dim" style="font-size:11px;margin-bottom:14px">坚持越久,奖励越大。达成当天自动到账宝箱+星币,特权卡去 🎁 奖励页领。</div>
      <div class="ms-road">
        <div v-for="m in roadmap" :key="m.days" class="ms-step" :class="[m.state, { hero: m.hero }]">
          <div class="ms-dot">{{ m.state==='done' ? '✓' : m.days }}</div>
          <div class="ms-body">
            <div class="ms-line1">
              <span class="ms-days">{{ m.days }} 天<span v-if="m.hero" class="ms-herotag">习惯养成</span></span>
              <span class="ms-statetag" :class="m.state">{{ m.state==='done' ? '已达成' : (m.state==='active' ? (m.daysLeft>0 ? '还差 '+m.daysLeft+' 天' : '就快到账') : '未解锁') }}</span>
            </div>
            <div class="ms-rewards">
              <span class="ms-rw">{{ m.boxName }}</span>
              <span class="ms-rw"><CoinIcon /> +{{ m.coins }}</span>
              <span class="ms-rw">🎖️ {{ m.privilege }}</span>
            </div>
            <div v-if="m.state==='active'" class="ms-prog"><i :style="{ width: m.pct+'%' }"></i></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 完整月历(直接内嵌,不用再点开) -->
    <Calendar embed />

    <!-- 漏打补卡(用免断签卡) -->
    <div v-if="missed.length" class="card" style="padding:16px;margin-bottom:16px;border-color:rgba(255,216,107,.35)">
      <div style="font-weight:600;margin-bottom:4px">🛡️ 漏打补卡</div>
      <div class="dim" style="font-size:11px;margin-bottom:12px">忘记打英语卡了?用「免断签卡」补上,连续天数不会中断。你现在有 <b style="color:#ffd86b">{{ cards }}</b> 张免断签卡。</div>
      <div v-for="d in missed" :key="d" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <span style="flex:1;font-size:14px">{{ fmtMd(d) }} <span class="dim" style="font-size:12px">· 没打英语卡</span></span>
        <button class="btn-accent" style="padding:7px 14px;font-size:13px" :disabled="cards<1" :style="cards<1 ? 'opacity:.45' : ''" @click="makeUp(d)">用卡补</button>
      </div>
      <div v-if="cards<1" class="dim" style="font-size:11px;margin-top:10px">🈳 没有免断签卡了。本周英语满勤 7 天,可在「🎁 奖励」页申请一张,家长批准后就能用来补卡。</div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:4px">⚡ 本周小奖励(自动到账)</div>
      <div class="dim" style="font-size:11px;margin-bottom:12px">本周「全勤天数」(当天早晚刷牙+洗澡+房间整洁都完成)到这些天数,游戏时间自动发到时间银行,无需申请。本周已全勤 {{ wp.sideFull }} 天。</div>
      <div v-for="r in wp.rules" :key="r.required_days" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <span style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700"
              :style="wp.sideFull>=r.required_days ? 'background:#6bffb0;color:#0a3d28' : 'background:rgba(255,255,255,.1)'">{{ wp.sideFull>=r.required_days ? '✓' : r.required_days }}</span>
        <span style="flex:1;font-size:14px" :class="{ dim: wp.sideFull < r.required_days }">满 {{ r.required_days }} 天:{{ r.reward_name }}</span>
      </div>
    </div>

    <div class="card" style="padding:14px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.7)">
      ❤️ 健康规则:不打卡时小愿的属性和健康会慢慢下降——先变虚弱、再生病(🤒),要是太久完全不管(差不多连续 10 天),它会撑不住变回一颗蛋,要重新孵化养大哦。<br>
      但别担心:<b style="color:#6bffb0">只要打卡或喂它吃东西就能回血</b>,每天坚持,它就健健康康、越长越棒 ✨(星币/皮肤/收集永远不会丢)。
    </div>
  </div>
</template>

<style scoped>
/* 连续签到 Hero */
.streak-hero { padding: 18px 16px;
  background: radial-gradient(120% 95% at 25% 0%, rgba(255,140,60,.22), transparent 58%), linear-gradient(160deg, rgba(255,216,107,.12), rgba(255,255,255,.04));
  border: 1px solid rgba(255,216,107,.32); }
.hero-row { display: flex; align-items: center; gap: 14px; }
.flame-wrap { position: relative; flex-shrink: 0; display: grid; place-items: center; }
.flame { line-height: 1; }
.ember { position: absolute; bottom: 10%; width: 5px; height: 5px; border-radius: 50%;
  background: radial-gradient(circle, #ffe08a, #ff7a3c); box-shadow: 0 0 6px 1px rgba(255,160,70,.8);
  animation: emberRise 2s ease-out infinite; opacity: 0; pointer-events: none; }
@keyframes emberRise { 0%{ transform: translateY(0) scale(.6); opacity: 0 } 15%{ opacity: 1 } 100%{ transform: translateY(-46px) scale(.2); opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .ember { animation: none; opacity: 0 } }
.hero-num { font-size: 40px; font-weight: 800; color: #ffd86b; line-height: 1; text-shadow: 0 0 18px rgba(255,216,107,.45); }
.hero-unit { font-size: 17px; font-weight: 700; color: rgba(255,255,255,.7); }
.hero-cur { font-size: 13px; color: rgba(255,255,255,.72); margin-top: 4px; }
.hero-side { text-align: right; font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.7; }
.hero-side b { color: #fff; font-size: 15px; }
.hero-next { margin-top: 13px; padding: 8px 12px; border-radius: 11px; font-size: 12px; text-align: center;
  background: rgba(255,216,107,.1); color: rgba(255,255,255,.8); }
.hero-next b { color: #ffd86b; font-size: 14px; }
.hero-weekhead { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; }
.day-cell.today { animation: todayPulse 1.6s ease-in-out infinite; }
@keyframes todayPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,216,107,.4);} 50%{box-shadow:0 0 0 4px rgba(255,216,107,.12);} }

/* 里程碑路线图 */
.ms-road { position: relative; }
.ms-step { display: flex; gap: 12px; padding: 0 0 14px; position: relative; }
.ms-step:not(:last-child)::before { content: ''; position: absolute; left: 15px; top: 30px; bottom: -2px; width: 2px; background: rgba(255,255,255,.12); }
.ms-step.done:not(:last-child)::before { background: rgba(107,255,176,.45); }
.ms-dot { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
  font-size: 13px; font-weight: 800; z-index: 1; background: rgba(255,255,255,.1); color: rgba(255,255,255,.55);
  border: 1px solid rgba(255,255,255,.18); }
.ms-step.done .ms-dot { background: #6bffb0; color: #0a3d28; border-color: transparent; }
.ms-step.active .ms-dot { background: linear-gradient(135deg,#ffd86b,#ffb347); color: #1a1426; border-color: transparent; animation: msDotPulse 1.8s ease-in-out infinite; }
.ms-step.hero .ms-dot { box-shadow: 0 0 0 3px rgba(255,216,107,.25); }
@keyframes msDotPulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(255,216,107,.45) } 50%{ box-shadow: 0 0 0 5px rgba(255,216,107,.1) } }
.ms-body { flex: 1; min-width: 0; padding-top: 1px; }
.ms-step.locked .ms-body { opacity: .5; }
.ms-line1 { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ms-days { font-size: 14px; font-weight: 700; }
.ms-herotag { font-size: 10px; font-weight: 800; color: #1a1426; background: linear-gradient(90deg,#ffd86b,#ffb347); border-radius: 999px; padding: 1px 7px; margin-left: 7px; }
.ms-statetag { font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 999px; flex-shrink: 0; }
.ms-statetag.done { color: #6bffb0; background: rgba(107,255,176,.14); }
.ms-statetag.active { color: #1a1426; background: #ffd86b; }
.ms-statetag.locked { color: rgba(255,255,255,.4); background: rgba(255,255,255,.07); }
.ms-rewards { display: flex; flex-wrap: wrap; gap: 6px 10px; margin-top: 5px; font-size: 11.5px; color: rgba(255,255,255,.75); }
.ms-rw { display: inline-flex; align-items: center; gap: 2px; }
.ms-prog { height: 6px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden; margin-top: 7px; }
.ms-prog i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg,#ffd86b,#ffb347); transition: width .6s; }
/* 签到皮肤跑道 */
.skin-card { background:radial-gradient(130% 90% at 50% 0%, rgba(255,158,199,.16), transparent 55%), rgba(255,255,255,.04); }
.skin-track { display:flex; gap:11px; overflow-x:auto; padding:2px 2px 6px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; }
.skin-track::-webkit-scrollbar { height:4px; }
.skin-track::-webkit-scrollbar-thumb { background:rgba(255,255,255,.15); border-radius:9px; }
.skin-node { flex:0 0 96px; scroll-snap-align:start; text-align:center; cursor:pointer; transition:transform .12s; }
.skin-node:active { transform:scale(.95); }
.skin-pic { position:relative; width:96px; height:96px; border-radius:16px; display:grid; place-items:center; overflow:hidden;
  background:radial-gradient(circle at 50% 35%, rgba(124,107,255,.25), rgba(255,255,255,.05)); border:1px solid rgba(255,255,255,.1); }
.skin-node.equipped .skin-pic { border-color:#ffd86b; box-shadow:0 0 0 1px #ffd86b, 0 0 12px -2px #ffd86b; }
.skin-pic img { width:84px; height:84px; object-fit:contain; }
.skin-lock { position:absolute; inset:0; display:grid; place-items:center; font-size:24px; }
.skin-on { position:absolute; bottom:0; left:0; right:0; font-size:10px; font-weight:700; color:#1a1426; background:#ffd86b; padding:1px 0; }
.skin-anim { position:absolute; top:4px; left:4px; font-size:9px; font-weight:700; color:#1a1426; background:linear-gradient(90deg,#8be9ff,#c79bff); border-radius:999px; padding:1px 6px; }
.skin-nm { font-size:11px; font-weight:600; margin-top:5px; white-space:nowrap; }
.skin-day { font-size:10px; color:#ffd86b; margin-top:1px; }
.skin-day.dim { color:rgba(255,255,255,.4); }
</style>
