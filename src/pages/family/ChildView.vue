<script setup>
// 家长端「看星晨」:孩子端状态的只读镜像(宠物动画/健康/属性/今日打卡/时间银行)。家长只能看,不能操作。
import { computed } from 'vue'
import { db, pet, petAttrs, streak, bank, child } from '../../lib/store.js'
import { STAGES, effectiveStage, healthState, HEALTH_MAX, charmTotal, DEX, isLow } from '../../lib/petConfig.js'
import { fmtDateTime, todayStr, weekStart } from '../../lib/util.js'
import { currentRoomImg } from '../../services/roomService.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'
import LivingPet from '../../components/pet/LivingPet.vue'
import { livingSet } from '../../lib/living.js'
import { BLEND_VIDEO_OK } from '../../lib/petAnims.js'

const p = computed(() => pet())
const a = computed(() => petAttrs())
const isEgg = computed(() => (p.value.stage_idx || 0) <= 0)
const moodTxt = { normal: '心情不错 😊', happy: '超级开心 🥰', low: '有点低落 😔', disappointed: '有点失望 😞' }

// 健康
const hp = computed(() => p.value.health == null ? HEALTH_MAX : Math.round(p.value.health))
// 活宠物镜像:跟孩子首页同款融合活视频(条件一致;只读不互动)
const livingSetCur = computed(() => livingSet(pet()))
const livingActive = computed(() => BLEND_VIDEO_OK && !!livingSetCur.value && (pet().room || 'night') === 'night' && !isLow(pet()) && (pet().risk || 0) < 2 && healthState(pet()) !== 'sick')
const hpState = computed(() => healthState(p.value))
const hpColor = computed(() => hpState.value === 'sick' ? '#ff5b5b' : hpState.value === 'weak' ? '#ffb347' : '#6bffb0')

// 五维属性(与孩子端同口径)
const skinCount = computed(() => (db.owned_skins || []).filter(k => k && k !== 'default').length)
const dexUnlocked = computed(() => DEX.filter(d => d.cond(p.value, a.value)).length)
const charmVal = computed(() => charmTotal(a.value.charm, skinCount.value, dexUnlocked.value))
const disciplineVal = computed(() => Math.round((a.value.discipline || 0) + ((streak().longest_streak) || 0)))
const attrs = computed(() => [
  { ic: '🧠', name: '智慧', v: a.value.wisdom, c: '#7c6bff' },
  { ic: '🛁', name: '清洁', v: a.value.cleanliness, c: '#6bd5ff' },
  { ic: '⚡', name: '活力', v: a.value.vitality, c: '#6bffb0' },
  { ic: '✨', name: '魅力', v: charmVal.value, c: '#ff9ec7' },
  { ic: '🔥', name: '自律', v: disciplineVal.value, c: '#ff9f5b' }
])
function bar(v) { return Math.min(100, v) + '%' }

// 今日打卡状态(只读):未打卡 / 待你确认 / 已确认 / 已标记虚报 / 争议
const today = todayStr()
function statusOf(taskId) {
  const c = db.checkins.find(x => x.task_id === taskId && x.checkin_date === today && x.status !== 'revoked')
  return c ? c.status : 'none'
}
const STAT = {
  none: { t: '未打卡', c: 'rgba(255,255,255,.4)', bg: 'rgba(255,255,255,.06)' },
  self_reported: { t: '⏳ 待你确认', c: '#ffd86b', bg: 'rgba(255,216,107,.14)' },
  confirmed: { t: '✓ 已完成', c: '#6bffb0', bg: 'rgba(107,255,176,.14)' },
  false_reported: { t: '⚠️ 虚报', c: '#ff7a7a', bg: 'rgba(255,122,122,.14)' },
  disputed: { t: '有争议', c: '#ff9ec7', bg: 'rgba(255,158,199,.14)' }
}
const todayTasks = computed(() => db.tasks.filter(t => t.is_active).map(t => ({ ...t, st: statusOf(t.id) })))
const doneToday = computed(() => todayTasks.value.filter(t => t.st === 'confirmed').length)

// 时间银行(只读)
const b = computed(() => bank())
const txns = computed(() => db.time_bank_transactions || [])
function localDay(iso) { return iso ? todayStr(new Date(iso)) : '' }
const balance = computed(() => Math.floor(b.value.current_balance_minutes || 0))
const todayNet = computed(() => { const k = todayStr(); let s = 0; for (const t of txns.value) if (localDay(t.created_at) === k) s += t.screen_minutes || 0; return Math.round(s) })
const weekNet = computed(() => { const wk = weekStart(todayStr()); let s = 0; for (const t of txns.value) { const d = localDay(t.created_at); if (d && weekStart(d) === wk) s += t.screen_minutes || 0 } return Math.round(s) })
const sources = computed(() => {
  let dep = 0, intr = 0, bon = 0
  for (const t of txns.value) { const m = t.screen_minutes || 0; if (m <= 0) continue; if (t.type === 'deposit') dep += m; else if (t.type === 'interest') intr += m; else if (t.type === 'bonus') bon += m }
  const arr = [
    { ic: '🏃', label: '运动存入', val: Math.round(dep), color: '#c08bff' },
    { ic: '💎', label: '利息(复利)', val: Math.round(intr), color: '#8be9ff' },
    { ic: '🎁', label: '奖励 / 宝箱', val: Math.round(bon), color: '#ffd86b' }
  ].filter(x => x.val > 0)
  const max = Math.max(1, ...arr.map(x => x.val))
  return arr.map(x => ({ ...x, pct: Math.round(x.val / max * 100) }))
})
// 收益分析:近10天双向涨跌柱(红收入/绿支出)——与孩子端时间银行同款
const chartDays = computed(() => { const now = new Date(), res = []; for (let i = 9; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); res.push({ key: todayStr(d), label: `${d.getMonth() + 1}/${d.getDate()}` }) } return res })
const chart = computed(() => {
  const inc = {}, exp = {}
  for (const t of txns.value) { const d = localDay(t.created_at); if (!d) continue; const m = t.screen_minutes || 0; if (m >= 0) inc[d] = (inc[d] || 0) + m; else exp[d] = (exp[d] || 0) - m }
  return chartDays.value.map(x => ({ ...x, income: Math.round(inc[x.key] || 0), expense: Math.round(exp[x.key] || 0) }))
})
const cmax = computed(() => Math.max(1, ...chart.value.flatMap(d => [d.income, d.expense])))
function barH(v) { return v > 0 ? Math.max(3, Math.round(v / cmax.value * 30)) : 0 }
const UP = '#ff5b5b', DOWN = '#2fcf86'
const recentFlow = computed(() => txns.value.slice(0, 6))
const META = { deposit: '🏃 运动存入', interest: '💎 利息', bonus: '🎁 奖励', withdraw: '🎮 玩游戏', penalty: '➖ 扣减' }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;align-items:center;gap:8px;margin:4px 2px 14px">
      <h2 style="font-size:18px;font-weight:700;border-left:3px solid #ffd86b;padding-left:10px;margin:0">👀 看星晨</h2>
      <span class="dim" style="font-size:11px">只看不改 · 帮你看清孩子那边的状态</span>
    </div>

    <!-- 宠物舞台(只读) -->
    <div class="card" style="position:relative;border-radius:24px;padding:14px;margin-bottom:12px;overflow:hidden">
      <div class="room" :style="{ backgroundImage: 'url(' + currentRoomImg() + ')' }"></div>
      <div class="room-mask"></div>
      <div style="position:relative;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div>
          <div style="display:flex;align-items:baseline;gap:7px">
            <span style="font-size:16px;font-weight:800">{{ p.name }}</span>
            <span style="font-size:11px;font-weight:800;color:#1a1426;background:linear-gradient(90deg,#ffd86b,#ffb347);border-radius:999px;padding:1px 8px">{{ isEgg ? '待孵化' : 'Lv.' + p.level }}</span>
          </div>
          <div class="dim" style="font-size:11px;margin-top:3px">{{ STAGES[effectiveStage(p)]?.name }} · {{ moodTxt[p.mood] }}</div>
        </div>
        <span v-if="hpState==='sick'" style="font-size:11px;color:#ff7a7a;font-weight:700">🤒 生病了</span>
      </div>
      <div style="position:relative;z-index:2;display:grid;place-items:center;padding:6px 0 2px">
        <LivingPet v-if="livingActive" :set="livingSetCur" :action="''" style="max-width:300px" />
        <PetAvatar v-else :pet="p" :attrs="a" :size="172" :interactive="false" />
      </div>
      <!-- 健康条 -->
      <div v-if="!isEgg" style="position:relative;z-index:2;display:flex;align-items:center;gap:10px;margin-top:4px">
        <span style="font-size:18px">{{ hpState==='sick' ? '🤒' : hpState==='weak' ? '😟' : '❤️' }}</span>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
            <span>健康 <b :style="{color:hpColor}">{{ hp }}</b><span class="dim" style="font-size:11px">/100</span></span>
            <span v-if="hpState==='sick'" style="color:#ff7a7a;font-size:11px">久不打卡会变回蛋</span>
            <span v-else-if="hpState==='weak'" style="color:#ffb347;font-size:11px">状态下滑</span>
          </div>
          <div class="bar"><i :style="{ width: hp+'%', background: hpColor }"></i></div>
        </div>
      </div>
    </div>

    <!-- 五维属性 -->
    <div class="card" style="padding:13px;margin-bottom:12px">
      <div style="font-weight:600;font-size:14px;margin-bottom:11px">📊 成长属性</div>
      <div v-for="at in attrs" :key="at.name" style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>{{ at.ic }} {{ at.name }}</span><span class="dim">{{ at.v }}</span></div>
        <div class="bar"><i :style="{ width: bar(at.v), background: at.c }"></i></div>
      </div>
    </div>

    <!-- 今日打卡状态 -->
    <div class="card" style="padding:13px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:11px">
        <span style="font-weight:600;font-size:14px">📋 今日打卡</span>
        <span class="dim" style="font-size:12px">已完成 <b style="color:#6bffb0">{{ doneToday }}</b> / {{ todayTasks.length }}</span>
      </div>
      <div v-for="t in todayTasks" :key="t.id" style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <span style="font-size:18px">{{ t.icon }}</span>
        <span style="flex:1;font-size:13px">{{ t.name }}<span v-if="t.task_type==='main'" style="font-size:10px;color:#ffd86b;margin-left:5px">主线</span></span>
        <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px" :style="{ color: STAT[t.st].c, background: STAT[t.st].bg }">{{ STAT[t.st].t }}</span>
      </div>
    </div>

    <!-- 时间银行(只读) -->
    <div class="card" style="padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-weight:600;font-size:14px">⏱️ 时间银行</span>
        <div style="display:flex;gap:7px">
          <span class="chip" :style="{ color: todayNet>=0?UP:DOWN, background:(todayNet>=0?UP:DOWN)+'22' }">今日 {{ todayNet>=0?'+':'' }}{{ todayNet }}</span>
          <span class="chip" :style="{ color: weekNet>=0?UP:DOWN, background:(weekNet>=0?UP:DOWN)+'22' }">本周 {{ weekNet>=0?'+':'' }}{{ weekNet }}</span>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:38px;font-weight:800;color:#ffd86b;line-height:1">{{ balance }}</div>
        <div class="dim" style="font-size:12px;margin-top:2px">分钟可玩 · 约 {{ Math.floor(balance/60) }} 小时 {{ balance%60 }} 分</div>
      </div>
      <!-- 收益分析:双向涨跌柱 -->
      <div class="dim" style="font-size:12px;margin-bottom:8px">📈 近 10 天收益分析(红涨绿跌):</div>
      <div class="cv-chart">
        <div v-for="d in chart" :key="d.key" class="cv-col">
          <div class="cv-up"><b v-if="d.income" class="cv-num" :style="{color:UP}">+{{ d.income }}</b><span class="cv-bar" :style="{ height: barH(d.income)+'px', background: UP, borderRadius:'4px 4px 0 0' }"></span></div>
          <div class="cv-base"></div>
          <div class="cv-down"><span class="cv-bar" :style="{ height: barH(d.expense)+'px', background: DOWN, borderRadius:'0 0 4px 4px' }"></span><b v-if="d.expense" class="cv-num" :style="{color:DOWN}">-{{ d.expense }}</b></div>
          <div class="cv-lb">{{ d.label }}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin:6px 0 12px;font-size:11px">
        <span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#ff5b5b"></i> 收入</span>
        <span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#2fcf86"></i> 支出</span>
      </div>
      <div v-if="sources.length">
        <div class="dim" style="font-size:12px;margin-bottom:8px">时间都从哪来:</div>
        <div v-for="s in sources" :key="s.label" style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>{{ s.ic }} {{ s.label }}</span><span style="font-weight:700" :style="{color:s.color}">{{ s.val }} 分</span></div>
          <div class="bar"><i :style="{ width: s.pct+'%', background: s.color }"></i></div>
        </div>
      </div>
      <div v-else class="dim" style="font-size:12px;text-align:center;padding:6px 0">还没有时间存入</div>
    </div>

    <!-- 最近时间流水 -->
    <div class="card" style="padding:13px;margin-bottom:12px">
      <div style="font-weight:600;font-size:14px;margin-bottom:10px">🧾 最近流水</div>
      <div v-if="!recentFlow.length" class="dim" style="font-size:12px;text-align:center;padding:6px 0">还没有流水</div>
      <div v-for="t in recentFlow" :key="t.id" style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <span style="flex:1;font-size:13px">{{ (META[t.type]||'') }}<span class="dim" style="font-size:11px"> · {{ fmtDateTime(t.created_at) }}</span></span>
        <span style="font-weight:700;font-size:13px" :style="{ color: (t.screen_minutes||0)>=0 ? UP : DOWN }">{{ (t.screen_minutes||0)>=0 ? '+' : '' }}{{ t.screen_minutes }}</span>
      </div>
    </div>

    <div class="dim" style="font-size:11px;text-align:center;padding:4px 14px">👀 这里是星晨那边的实时状态镜像,你只看不改;要操作请用「核验」「兑换」等页面。</div>
  </div>
</template>

<style scoped>
.room { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: .5; }
.room-mask { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,8,22,.35), rgba(10,8,22,.72)); }
.bar { height: 8px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 999px; transition: width .5s ease; }
.chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
/* 收益分析双向柱 */
.cv-chart { display: flex; gap: 3px; }
.cv-col { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
.cv-up { height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.cv-down { height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
.cv-base { height: 1px; width: 100%; background: rgba(255,255,255,.2); }
.cv-bar { width: 60%; max-width: 15px; flex: none; transition: height .4s ease; }
.cv-num { font-size: 9px; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.5); }
.cv-lb { font-size: 8px; color: rgba(255,255,255,.5); margin-top: 2px; white-space: nowrap; }
</style>
