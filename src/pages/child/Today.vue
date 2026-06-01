<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, pet, petAttrs, credit as creditRow, bank as bankRow, setUser } from '../../lib/store.js'
import { dominant, FORM_LABEL, STAGES, isLow, MAX_LEVEL, expForLevel, tierFromLevel, TIER_START, HATCH_EXP } from '../../lib/petConfig.js'
import { levelInfo } from '../../services/creditService.js'
import * as checkinSvc from '../../services/checkinService.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'
import EvolutionModal from '../../components/pet/EvolutionModal.vue'
import BoxModal from '../../components/pet/BoxModal.vue'
import CheckinPhotoModal from '../../components/CheckinPhotoModal.vue'
import { playTaskAnim, spawnFloaty, spawnBurst } from '../../lib/petFx.js'
import { toast } from '../../lib/toast.js'
import { sfx, soundEnabled, toggleSound } from '../../lib/sound.js'

const p = computed(() => pet())
const a = computed(() => petAttrs())
const fx = ref(null)
const dogRef = ref(null)
const happy = ref(false)
const evoStage = ref(null)
const evoHatch = ref(false)     // 进化弹窗是否为"孵化"语境
const boxReward = ref(null)     // { tier, minutes, taskName } 开箱动画
const photoTask = ref(null)     // 正在拍照打卡的任务
const snd = ref(soundEnabled())

// 属性说明:点首页属性卡弹出"这是什么 + 做哪些任务能涨"
const ATTR_META = {
  wisdom:      { icon: '🧠', name: '智慧', color: '#7c6bff', blurb: '越爱学习越聪明。完成下面的任务能提升智慧:' },
  cleanliness: { icon: '🛁', name: '清洁', color: '#6bd5ff', blurb: '保持干净整洁,清洁值就高。完成下面的任务能提升清洁:' },
  vitality:    { icon: '⚡', name: '活力', color: '#6bffb0', blurb: '多运动,身体棒棒更有活力。完成下面的任务能提升活力:' },
  charm:       { icon: '✨', name: '魅力', color: '#ff9ec7', blurb: '由内而外的好状态。完成下面的任务能提升魅力:' }
}
const attrInfo = ref(null)      // 当前点开的属性 key
const attrTasksFor = (key) => db.tasks.filter(t => t.is_active && (t.attribute_key === key || t.attribute_key2 === key))
const actionAnim = ref('')      // 临时播放的动作视频:study/brush/bath/badminton
let actionTimer = null

const tasks = computed(() => db.tasks.filter(t => t.is_active))
const pending = computed(() => checkinSvc.pendingInteractions())
const doneCount = computed(() => tasks.value.filter(t => { const c = checkinSvc.statusOf(t.id); return c && c.interacted }).length)
const trust = computed(() => levelInfo(creditRow().credit_score))

// 蛋阶段
const isEgg = computed(() => (p.value.stage_idx || 0) <= 0)
// 经验进度(蛋阶段是孵化进度,满 HATCH_EXP 孵化)
const expNeed = computed(() => isEgg.value ? HATCH_EXP : expForLevel(p.value.level || 1))
const expPct = computed(() => (!isEgg.value && p.value.level >= MAX_LEVEL) ? 100 : Math.min(100, Math.round((p.value.exp || 0) / expNeed.value * 100)))

function taskState(t) {
  const c = checkinSvc.statusOf(t.id)
  if (!c) return 'none'
  if (c.status === 'self_reported') return 'wait'
  if (c.status === 'confirmed' && !c.interacted) return 'ready'
  if (c.status === 'confirmed' && c.interacted) return 'done'
  if (c.status === 'false_reported') return 'false'
  if (c.status === 'disputed') return 'dispute'
  return 'other'
}

const evoHint = computed(() => {
  if (isEgg.value) {
    const need = Math.max(0, HATCH_EXP - (p.value.exp || 0))
    return { warn: false, html: `🥚 这是「初遇蛋」。坚持打卡攒经验,还差 <b>${need}</b> 点就孵化成幼犬啦 ✨` }
  }
  if (p.value.risk >= 2) return { warn: true, html: `⚠️ 连续没完成英语,<b>${p.value.name}</b> 进入<b style="color:#ff7a7a">退阶风险</b>。连续学几天可恢复。` }
  if (isLow(p.value)) return { warn: false, html: `今天 <b>${p.value.name}</b> 的能量弱了一些。明天补上英语,它还能重新变聪明 ✨` }
  if (pending.value.length) return { warn: false, html: `🎉 家人确认啦!点下面的道具,陪 <b>${p.value.name}</b> 互动长经验吧` }
  if (p.value.level >= MAX_LEVEL) return { warn: false, html: `<b>${p.value.name}</b> 已满级 Lv.30 星愿神犬 🌟` }
  const need = expNeed.value - (p.value.exp || 0)
  const nextTierStart = TIER_START[tierFromLevel(p.value.level) + 1]
  const lvToTier = nextTierStart ? nextTierStart - p.value.level : 0
  const tierTxt = lvToTier > 0 ? ` · 再升 <b>${lvToTier}</b> 级进化形态` : ''
  return { warn: false, html: `Lv.${p.value.level} · 再得 <b>${need}</b> 点经验升级${tierTxt}` }
})

function doTask(t) {
  if (taskState(t) !== 'none') return
  photoTask.value = t      // 先弹拍照打卡窗
}
function onPhotoDone(photoUrl) {
  const t = photoTask.value
  photoTask.value = null
  if (!t) return
  try {
    const res = checkinSvc.createCheckin(t.id, { photoUrl })
    sfx.checkin()
    toast(photoUrl ? `已拍照打卡:${t.name} 📸 等家人确认` : `已打卡:${t.name} ✅ 等家人确认就能陪小愿玩啦`)
    res.weeklyGranted.forEach(r => setTimeout(() => toast(`🎉 本周全勤满 ${r.required_days} 天:${r.reward_name}`), 700))
  } catch (e) { toast(e.message) }
}

let afterBoxRes = null
// 升级提示 / 进化弹窗:字段在 res.delta 里(leveledUp / newLevel / tierUp)
function runLevelFx(res) {
  const lv = res.delta || {}
  if (lv.tierUp) setTimeout(() => { sfx.evolve(); evoHatch.value = !!lv.hatched; evoStage.value = lv.tierUp }, 250)
  else if (lv.leveledUp) setTimeout(() => { sfx.levelup(); spawnBurst(fx.value, ['⭐', '✨', '🌟', '💫'], 10); toast(`⬆️ 升到 Lv.${lv.newLevel} 啦!`) }, 250)
}
function interactProp(c) {
  const res = checkinSvc.interact(c.id)
  if (!res) return
  const kind = res.task.anim || 'study'
  playTaskAnim(fx.value, kind, dogRef.value?.$el)
  // 播放对应动作视频 ~3.8s 后回到待机
  actionAnim.value = kind
  clearTimeout(actionTimer)
  actionTimer = setTimeout(() => { actionAnim.value = '' }, 3800)
  sfx.pop()
  happy.value = true; setTimeout(() => (happy.value = false), 600)
  let msg = res.task.task_type === 'main' ? `小愿吸收了知识星!智慧 +${res.task.base_exp} 🧠` : `${res.task.name}互动完成!`
  toast(msg)
  // 本周全勤奖励提示(支线互动达标时自动发放)
  ;(res.weeklyGranted || []).forEach((r, i) => setTimeout(() => { sfx.levelup(); toast(`🎉 本周全勤满 ${r.required_days} 天:${r.reward_name}`) }, 1000 + i * 950))
  if (res.blindbox > 0 && res.boxTier) {
    // 开宝箱动画;关箱后再播升级/进化,避免弹窗叠加
    afterBoxRes = res
    setTimeout(() => { sfx.levelup(); boxReward.value = { tier: res.boxTier, minutes: res.blindbox, taskName: res.task.name } }, 650)
  } else {
    runLevelFx(res)
  }
}
function closeBox() {
  boxReward.value = null
  const res = afterBoxRes; afterBoxRes = null
  if (res) runLevelFx(res)
}

const NORMAL_REACTIONS = [
  '汪!摸摸头最开心了 🐾', '小愿蹭了蹭你的手 🥰', '尾巴摇得像螺旋桨~ 💫',
  '小愿好喜欢你呀!💛', '它开心地转了个圈 ✨', '再摸一下嘛~ 🐶', '小愿把头靠过来了 😊'
]
const LOW_REACTIONS = [
  '小愿有点没精神…摸摸头 🥺', '它轻轻舔了下你的手指 💧', '陪陪它,明天会更好的 🌙', '小愿需要你 🥺'
]
let petCount = 0
let petResetTimer = null
function petDog() {
  happy.value = !isLow(p.value); setTimeout(() => (happy.value = false), 600)
  sfx.pet()
  const low = isLow(p.value)
  spawnBurst(fx.value, low ? ['💧', '🩵'] : ['💛', '💕', '⭐', '✨', '🐾'], low ? 4 : 6)
  // 摸基础形态(幼犬/成长期)时播"开心跳"视频(开心跳是基础幼犬动作,进化形态不匹配故只在 1-2 阶段)
  const si = p.value.stage_idx || 0
  if (!low && si >= 1 && si <= 2) {
    actionAnim.value = 'happy'
    clearTimeout(actionTimer)
    actionTimer = setTimeout(() => { actionAnim.value = '' }, 2500)
  }
  // 连续摸头彩蛋
  petCount++
  clearTimeout(petResetTimer)
  petResetTimer = setTimeout(() => { petCount = 0 }, 3000)
  if (!low && petCount >= 5) {
    petCount = 0
    toast('哇!小愿被你宠上天啦 🎉💛')
    spawnBurst(fx.value, ['💛', '💕', '⭐', '🌟', '✨'], 12)
  } else {
    const arr = low ? LOW_REACTIONS : NORMAL_REACTIONS
    toast(arr[Math.floor(Math.random() * arr.length)])
  }
}

const router = useRouter()
function switchAccount() {
  if (window.confirm('切换账号?会回到角色选择页(数据已云端保存,不会丢)。')) {
    setUser(null); router.push('/login')
  }
}

function bar(v) { return Math.min(100, v) + '%' }
onMounted(() => {
  const stage = document.getElementById('homeStage')
  if (stage) for (let i = 0; i < 12; i++) {
    const s = document.createElement('div'); s.className = 'spark'
    s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%'
    s.style.animationDelay = Math.random() * 3 + 's'; stage.appendChild(s)
  }
})
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="dim" style="font-size:14px">你好,<b style="color:#fff">星晨</b></div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="card" style="padding:6px 11px;font-size:13px;font-weight:600;color:#ffd86b">⭐ 信任 Lv.{{ trust.stars }}</span>
        <span class="card" style="padding:6px 11px;font-size:13px;font-weight:600">⏱️ {{ Math.floor(bankRow().current_balance_minutes) }}分</span>
        <button class="card" style="padding:6px 9px;font-size:14px;line-height:1" @click="snd=toggleSound()">{{ snd ? '🔊' : '🔇' }}</button>
        <button class="card" style="padding:6px 9px;font-size:14px;line-height:1" title="切换账号" @click="switchAccount">🔄</button>
      </div>
    </div>

    <!-- 宠物舞台 -->
    <div id="homeStage" class="card" style="position:relative;border-radius:28px;padding:16px;margin-bottom:12px;overflow:hidden"
         :style="p.risk>=2 ? 'background:radial-gradient(100% 80% at 50% 0%, rgba(255,122,122,.28), transparent 60%), rgba(40,10,20,.35)' : isLow(p) ? 'background:rgba(0,0,0,.3)' : 'background:radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.35), transparent 60%), rgba(0,0,0,.18)'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <span class="card" style="padding:5px 10px;border-radius:999px;font-size:12px;color:#ffd86b">{{ STAGES[p.stage_idx].name }}{{ isEgg ? ' · 待孵化' : ' · Lv.' + p.level }}</span>
        <span class="dim" style="font-size:12px">{{ { normal:'心情不错 😊', happy:'超级开心 🥰', low:'有点低落 😔', disappointed:'有点失望 😞' }[p.mood] }}</span>
      </div>
      <div style="display:flex;justify-content:center;align-items:flex-end;height:218px;position:relative">
        <PetAvatar ref="dogRef" :pet="p" :attrs="a" :happy="happy" :action-anim="actionAnim" @pet="petDog" />
        <div ref="fx" class="fx"></div>
      </div>

      <!-- 经验条 -->
      <div style="position:relative;z-index:5;margin-top:2px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
          <span class="dim">{{ isEgg ? '🥚 孵化进度' : '经验 Lv.' + p.level }}</span>
          <span class="dim">{{ isEgg ? (p.exp||0)+' / '+expNeed : (p.level>=30 ? '满级' : (p.exp||0)+' / '+expNeed) }}</span>
        </div>
        <div class="bar"><i style="background:linear-gradient(90deg,#ffd86b,#ffb347)" :style="{width:expPct+'%'}"></i></div>
      </div>

      <!-- 可互动道具 -->
      <div v-if="pending.length" style="position:relative;z-index:5;margin-top:12px">
        <div style="font-size:12px;color:#ffd86b;text-align:center;margin-bottom:8px">✨ 点道具陪小愿互动</div>
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
          <button v-for="c in pending" :key="c.id" class="prop-btn" @click="interactProp(c)">
            <span style="font-size:26px">{{ db.tasks.find(t=>t.id===c.task_id)?.icon }}</span>
            <span style="font-size:10px">点我</span>
          </button>
        </div>
      </div>
    </div>

    <div style="text-align:center;font-size:12px;line-height:1.55;margin:2px 6px 14px" :class="{ dim: !evoHint.warn }" v-html="evoHint.html"></div>

    <!-- 属性(点开看说明) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px">
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='wisdom'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>🧠 智慧 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ a.wisdom }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#7c6bff,#b3a6ff)" :style="{width:bar(a.wisdom)}"></i></div></div>
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='cleanliness'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>🛁 清洁 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ a.cleanliness }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#6bd5ff,#a6f0ff)" :style="{width:bar(a.cleanliness)}"></i></div></div>
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='vitality'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>⚡ 活力 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ a.vitality }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#6bffb0,#b0ffd5)" :style="{width:bar(a.vitality)}"></i></div></div>
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='charm'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>✨ 魅力 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ a.charm }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#ff9ec7,#ffc7e0)" :style="{width:bar(a.charm)}"></i></div></div>
    </div>

    <!-- 属性说明弹窗 -->
    <div v-if="attrInfo" class="attr-overlay" @click.self="attrInfo=null">
      <div class="attr-sheet" :style="{ '--ac': ATTR_META[attrInfo].color }">
        <div style="font-size:17px;font-weight:700;margin-bottom:6px">{{ ATTR_META[attrInfo].icon }} {{ ATTR_META[attrInfo].name }}
          <span style="font-size:13px;font-weight:500;color:var(--ac)">· 当前 {{ a[attrInfo] }}</span>
        </div>
        <div class="dim" style="font-size:13px;line-height:1.55;margin-bottom:12px">{{ ATTR_META[attrInfo].blurb }}</div>
        <div v-for="t in attrTasksFor(attrInfo)" :key="t.id" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
          <span style="font-size:20px">{{ t.icon }}</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">{{ t.name }} <span v-if="t.task_type==='main'" style="font-size:10px;color:#ffd86b">主线</span></div>
            <div class="dim" style="font-size:11px">{{ t.desc || (t.task_type==='main' ? '英语主线' : '支线') }}</div>
          </div>
          <span style="font-size:13px;font-weight:700;color:var(--ac)">+{{ (t.attribute_key===attrInfo ? t.base_exp : t.base_exp2) }}</span>
        </div>
        <div v-if="!attrTasksFor(attrInfo).length" class="dim" style="font-size:13px;text-align:center;padding:10px 0">暂时没有提升这个属性的任务</div>
        <button class="btn-accent" style="width:100%;margin-top:14px;padding:11px" @click="attrInfo=null">知道啦</button>
      </div>
    </div>

    <!-- 任务 -->
    <div style="font-size:15px;font-weight:700;margin:4px 2px 10px;display:flex;align-items:center">
      📋 今日任务 <span class="dim" style="margin-left:auto;font-size:12px;font-weight:500">{{ doneCount }}/{{ tasks.length }}</span>
    </div>
    <div v-for="t in tasks" :key="t.id" class="card"
         :style="t.task_type==='main' ? 'border-color:rgba(255,216,107,.4);background:linear-gradient(135deg,rgba(255,216,107,.12),rgba(255,255,255,.08))' : ''"
         style="display:flex;align-items:center;gap:12px;padding:13px;margin-bottom:10px">
      <div style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:22px;background:rgba(124,107,255,.18)">{{ t.icon }}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:600">{{ t.name }}</div>
        <div class="dim" style="font-size:12px;margin-top:2px">{{ t.task_type==='main' ? '主线 · 智慧 + 连续签到' : (t.desc || '支线') }}<span v-if="t.blindbox" style="color:#ffd86b"> · 🎁开宝箱</span></div>
        <span style="display:inline-block;font-size:10px;padding:2px 7px;border-radius:999px;margin-top:5px;font-weight:600"
              :style="t.task_type==='main' ? 'background:rgba(255,216,107,.2);color:#ffd86b' : 'background:rgba(124,107,255,.25);color:#c3b8ff'">
          {{ t.task_type==='main' ? '主线' : '支线' }}
        </span>
      </div>
      <button v-if="taskState(t)==='none'" class="btn-accent" style="padding:10px 15px" @click="doTask(t)">打卡</button>
      <span v-else-if="taskState(t)==='wait'" style="font-size:12px;color:#ffd86b;text-align:center;line-height:1.4">⏳ 等家人<br>确认</span>
      <span v-else-if="taskState(t)==='ready'" style="font-size:12px;color:#6bffb0;text-align:center;line-height:1.4">✨ 上去<br>陪小愿</span>
      <span v-else-if="taskState(t)==='done'" style="font-size:12px;color:#6bffb0;text-align:center;line-height:1.4">✓ 已完成</span>
      <span v-else-if="taskState(t)==='false'" style="font-size:12px;color:#ff7a7a;text-align:center;line-height:1.4">⚠️ 虚报</span>
      <span v-else style="font-size:12px;color:#ff9ec7;text-align:center">争议中</span>
    </div>

    <EvolutionModal v-if="evoStage" :pet="p" :attrs="a" :stage="evoStage" :hatch="evoHatch" @close="evoStage=null; evoHatch=false" />
    <BoxModal v-if="boxReward" :tier="boxReward.tier" :minutes="boxReward.minutes" :task-name="boxReward.taskName" @close="closeBox" />
    <CheckinPhotoModal v-if="photoTask" :task="photoTask" @done="onPhotoDone" @close="photoTask=null" />
  </div>
</template>

<style scoped>
.attr-card { transition: transform .12s ease; }
.attr-card:active { transform: scale(.97); }
.attr-overlay { position: fixed; inset: 0; z-index: 70; display: grid; place-items: end center;
  background: rgba(6,4,16,.7); backdrop-filter: blur(3px); animation: af .2s ease; }
.attr-sheet { width: 100%; max-width: 460px; background: #14111f; border: 1px solid rgba(255,255,255,.12);
  border-radius: 22px 22px 0 0; padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0,0,0,.4); animation: sheetup .28s cubic-bezier(.2,1,.4,1); }
@keyframes af { from { opacity: 0 } to { opacity: 1 } }
@keyframes sheetup { from { transform: translateY(100%) } to { transform: translateY(0) } }
</style>
