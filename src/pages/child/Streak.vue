<script setup>
import { computed } from 'vue'
import { db, streak, mainTask, child } from '../../lib/store.js'
import { weeklyProgress, nextCumulative, missedMainDays } from '../../services/streakService.js'
import { ownedFreezeCards } from '../../services/rewardService.js'
import { makeUpMissedDay } from '../../services/checkinService.js'
import { skinTrackState, equipSkin } from '../../services/skinService.js'
import { todayStr, addDays } from '../../lib/util.js'
import { REWARDS } from '../../lib/rewardConfig.js'
import { toast } from '../../lib/toast.js'
import { sfx } from '../../lib/sound.js'

const wp = computed(() => weeklyProgress())
const nc = computed(() => nextCumulative())
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

// 皮肤衣柜(拥有的可装扮;未拥有去商城买)
const skins = computed(() => skinTrackState())
function equip(s) {
  if (!s.owned) { toast(`还没拥有 ${s.emoji}${s.name},去🛍️商城用星币买下它`); return }
  equipSkin(s.equipped ? 'default' : s.key)
  sfx.pop()
  toast(s.equipped ? '已脱下装扮,变回原来的样子' : `已给小愿换上「${s.name}」${s.emoji}`)
}

const weekDays = computed(() => {
  const mt = mainTask()
  const done = new Set(db.checkins.filter(c => c.task_id === mt?.id && c.status !== 'false_reported' && c.status !== 'revoked').map(c => c.checkin_date))
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

    <!-- 皮肤衣柜 -->
    <div class="card skin-card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-weight:700">🎀 皮肤衣柜</span>
        <router-link to="/child/shop" class="dim" style="font-size:12px;color:#ffd86b;text-decoration:none">🛍️ 去商城 ›</router-link>
      </div>
      <div class="dim" style="font-size:11px;margin-bottom:12px">拥有的皮肤点一下就能给小愿换上;没有的去商城用星币购买。</div>
      <div class="skin-track">
        <div v-for="s in skins" :key="s.key" class="skin-node" :class="{ locked:!s.owned, equipped:s.equipped }" @click="equip(s)">
          <div class="skin-pic">
            <img :src="s.img" :alt="s.name" :style="s.owned ? '' : 'filter:grayscale(1) brightness(.45)'" />
            <span v-if="!s.owned" class="skin-lock">🔒</span>
            <span v-if="s.animated" class="skin-anim">✨动</span>
            <span v-if="s.equipped" class="skin-on">装扮中</span>
          </div>
          <div class="skin-nm">{{ s.emoji }} {{ s.name }}</div>
          <div class="skin-day" :class="{ dim:!s.owned }">{{ s.owned ? (s.equipped ? '点击脱下' : '点击装扮') : '商城购买' }}</div>
        </div>
      </div>
    </div>

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
      <div class="dim" style="font-size:11px;margin-bottom:12px">本周「全勤天数」(当天早晚刷牙+洗澡+房间整洁都完成)到这些天数,游戏时间自动发到时间银行,无需申请。本周已全勤 {{ wp.sideFull }} 天。</div>
      <div v-for="r in wp.rules" :key="r.required_days" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <span style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700"
              :style="wp.sideFull>=r.required_days ? 'background:#6bffb0;color:#0a3d28' : 'background:rgba(255,255,255,.1)'">{{ wp.sideFull>=r.required_days ? '✓' : r.required_days }}</span>
        <span style="flex:1;font-size:14px" :class="{ dim: wp.sideFull < r.required_days }">满 {{ r.required_days }} 天:{{ r.reward_name }}</span>
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
