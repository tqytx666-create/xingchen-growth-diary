<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, pet, petAttrs, credit as creditRow, bank as bankRow, setUser } from '../../lib/store.js'
import { STAGES, isLow, MAX_LEVEL, expForLevel, tierFromLevel, TIER_START, HATCH_EXP } from '../../lib/petConfig.js'
import { levelInfo } from '../../services/creditService.js'
import * as checkinSvc from '../../services/checkinService.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'
import LivingPet from '../../components/pet/LivingPet.vue'
import { livingSet, actionForAnim } from '../../lib/living.js'
import { BLEND_VIDEO_OK } from '../../lib/petAnims.js'
import EvolutionModal from '../../components/pet/EvolutionModal.vue'
import CheckinPhotoModal from '../../components/CheckinPhotoModal.vue'
import { playTaskAnim, spawnFloaty, spawnBurst } from '../../lib/petFx.js'
import { fmtDateTime } from '../../lib/util.js'
import { currentRoomImg, roomTrackState, equipRoom } from '../../services/roomService.js'
import { ownedItems, useItem } from '../../services/itemService.js'
import { placedFurniture, furnitureState, togglePlace } from '../../services/furnitureService.js'
import { coins } from '../../services/coinService.js'
import { toast } from '../../lib/toast.js'
import { sfx, soundEnabled, toggleSound } from '../../lib/sound.js'

const p = computed(() => pet())
const a = computed(() => petAttrs())
const fx = ref(null)
const dogRef = ref(null)
const happy = ref(false)
const evoStage = ref(null)
const evoHatch = ref(false)     // 进化弹窗是否为"孵化"语境
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

// 诚信分记录(点顶部"信任"徽章打开)
const creditOpen = ref(false)
const creditLogs = computed(() => (db.credit_transactions || []).slice(0, 40))
const userName = (id) => (id === 'system' ? '系统' : (db.users.find(u => u.id === id)?.display_name || ''))

// 活宠物:皮肤有活视频 + 默认房间 + 已孵化 + 状态正常 + 支持自动播视频(非微信)→ 启用
const livingSetCur = computed(() => livingSet(p.value))
const livingActive = computed(() => BLEND_VIDEO_OK && !!livingSetCur.value && (p.value.room || 'night') === 'night'
  && !isLow(p.value) && p.value.risk < 2)
const livingAction = ref('')

// 宠物窝房间
const roomBg = computed(() => currentRoomImg())
const roomOpen = ref(false)
const rooms = computed(() => roomTrackState())
function pickRoom(r) {
  if (!r.owned) { toast(`还没拥有 ${r.emoji}${r.name},去🛍️商城用星币买下它`); return }
  equipRoom(r.key); sfx.pop(); toast(`已搬进「${r.name}」${r.emoji}`); roomOpen.value = false
}

// 家具
const placed = computed(() => placedFurniture())
const decorOpen = ref(false)
const furns = computed(() => furnitureState())
function toggleFurn(f) {
  if (!f.owned) { toast(`还没拥有 ${f.emoji}${f.name},去🛍️商城购买`); return }
  togglePlace(f.key); sfx.pop()
}

// 道具
const items = computed(() => ownedItems())
function useItemOn(it) {
  if (it.count < 1) { toast(`没有${it.name}啦,开宝箱有机会获得 🎁`); return }
  const res = useItem(it.key)
  if (!res) return
  livingAction.value = res.item.kind === 'feed' ? 'eat' : 'happy'   // 活宠物:喂食→吃,玩耍→开心
  sfx.pop()
  happy.value = true; setTimeout(() => (happy.value = false), 800)
  spawnBurst(fx.value, res.item.burst, 9)
  const si = p.value.stage_idx || 0
  if (si >= 1 && si <= 2) { actionAnim.value = 'happy'; clearTimeout(actionTimer); actionTimer = setTimeout(() => { actionAnim.value = '' }, 2500) }
  toast(res.item.msg)
  runLevelFx({ delta: res.lv })   // 道具经验可能触发孵化/升级
}
const actionAnim = ref('')      // 临时播放的动作视频:study/brush/bath/badminton
let actionTimer = null

const tasks = computed(() => db.tasks.filter(t => t.is_active))
const pending = computed(() => checkinSvc.pendingInteractions())
const doneCount = computed(() => tasks.value.filter(t => { const c = checkinSvc.statusOf(t.id); return c && c.interacted }).length)
const trust = computed(() => levelInfo(creditRow().credit_score))
const coinBal = computed(() => coins())

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

// 升级提示 / 进化弹窗:字段在 res.delta 里(leveledUp / newLevel / tierUp)
function runLevelFx(res) {
  const lv = res.delta || {}
  if (lv.tierUp) setTimeout(() => { sfx.evolve(); evoHatch.value = !!lv.hatched; evoStage.value = lv.tierUp }, 250)
  else if (lv.leveledUp) setTimeout(() => { sfx.levelup(); spawnBurst(fx.value, ['⭐', '✨', '🌟', '💫'], 10); toast(`⬆️ 升到 Lv.${lv.newLevel} 啦!`) }, 250)
}
function interactProp(c) {
  const res = checkinSvc.interact(c.id)
  if (!res) return
  livingAction.value = actionForAnim(res.task.anim)   // 活宠物:丝滑切到对应动作视频
  const kind = res.task.anim || ''   // 静态模式:有专属动作才播视频;无(如整理房间)用通用星光,别错播读书
  if (kind) {
    playTaskAnim(fx.value, kind, dogRef.value?.$el)
    actionAnim.value = kind   // 播放对应动作视频 ~3.8s 后回到待机
    clearTimeout(actionTimer)
    actionTimer = setTimeout(() => { actionAnim.value = '' }, 3800)
  } else {
    spawnBurst(fx.value, ['✨', '💛', '🐾'], 6)
  }
  sfx.pop()
  happy.value = true; setTimeout(() => (happy.value = false), 600)
  let msg = res.task.task_type === 'main' ? `小愿吸收了知识星!智慧 +${res.task.base_exp} 🧠` : `${res.task.name}互动完成!`
  if (res.coinsEarned) msg += ` 🪙+${res.coinsEarned}`
  toast(msg)
  // 本周全勤奖励提示(支线互动达标时自动发放)
  ;(res.weeklyGranted || []).forEach((r, i) => setTimeout(() => { sfx.levelup(); toast(`🎉 本周全勤满 ${r.required_days} 天:${r.reward_name}`) }, 1000 + i * 950))
  // 获得宝箱(不当场开,存进库存,去奖励页自己点开)
  if (res.boxTier) {
    const nm = { silver: '🥈 银宝箱', gold: '🥇 金宝箱', diamond: '💎 钻石宝箱' }[res.boxTier] || '宝箱'
    setTimeout(() => { sfx.levelup(); toast(`🎁 获得${nm}!去「🎁 奖励」页打开它`) }, 700)
  }
  runLevelFx(res)
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
  if (!isLow(p.value)) livingAction.value = 'happy'   // 活宠物:摸头→开心动作
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
        <span class="card" style="padding:6px 11px;font-size:13px;font-weight:600;color:#ffd86b;cursor:pointer" @click="creditOpen=true">⭐ 信任 Lv.{{ trust.stars }} <span style="opacity:.5;font-size:11px">ⓘ</span></span>
        <span class="card" style="padding:6px 11px;font-size:13px;font-weight:600">⏱️ {{ Math.floor(bankRow().current_balance_minutes || 0) }}分</span>
        <span class="card" style="padding:6px 11px;font-size:13px;font-weight:600;color:#ffd86b;cursor:pointer" @click="router.push('/child/shop')">🪙 {{ coinBal }}</span>
        <button class="card" style="padding:6px 9px;font-size:14px;line-height:1" @click="snd=toggleSound()">{{ snd ? '🔊' : '🔇' }}</button>
        <button class="card" style="padding:6px 9px;font-size:14px;line-height:1" title="切换账号" @click="switchAccount">🔄</button>
      </div>
    </div>

    <!-- 宠物舞台 -->
    <div id="homeStage" class="card" style="position:relative;border-radius:28px;padding:16px;margin-bottom:12px;overflow:hidden"
         :style="p.risk>=2 ? 'background:radial-gradient(100% 80% at 50% 0%, rgba(255,122,122,.28), transparent 60%), rgba(40,10,20,.35)' : isLow(p) ? 'background:rgba(0,0,0,.3)' : 'background:radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.35), transparent 60%), rgba(0,0,0,.18)'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <span class="card" style="padding:5px 10px;border-radius:999px;font-size:12px;color:#ffd86b">{{ STAGES[p.stage_idx ?? 0]?.name }}{{ isEgg ? ' · 待孵化' : ' · Lv.' + p.level }}</span>
        <span class="dim" style="font-size:12px">{{ { normal:'心情不错 😊', happy:'超级开心 🥰', low:'有点低落 😔', disappointed:'有点失望 😞' }[p.mood] }}</span>
      </div>
      <!-- 活宠物:在房间里溜达,互动时丝滑切到对应动作视频 -->
      <LivingPet v-if="livingActive" :set="livingSetCur" :action="livingAction" @done="livingAction=''" @tap="petDog" />
      <!-- 静态:蛋/低落/换了房间或皮肤/微信 时回落 -->
      <div v-else class="pet-room" :style="{ backgroundImage: 'url(' + roomBg + ')' }">
        <div class="pet-room-glow"></div>
        <img v-for="f in placed" :key="f.key" :src="f.img" :alt="f.name" class="furn" :style="f.slot" />
        <button class="room-btn" title="换房间" @click.stop="roomOpen=true">🏠</button>
        <button class="room-btn decor-btn" title="装饰" @click.stop="decorOpen=true">🛋️</button>
        <div class="pet-slot">
          <PetAvatar ref="dogRef" :pet="p" :attrs="a" :happy="happy" :action-anim="actionAnim" @pet="petDog" />
          <div ref="fx" class="fx"></div>
        </div>
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

    <!-- 道具栏 -->
    <div class="card" style="padding:11px 13px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px">
        <span style="font-weight:600;font-size:14px">🎒 道具</span>
        <span class="dim" style="font-size:11px">点一下喂给小愿,开心又长经验</span>
      </div>
      <div style="display:flex;gap:8px;justify-content:space-around">
        <button v-for="it in items" :key="it.key" class="item-btn" :class="{ empty: it.count < 1 }" @click="useItemOn(it)">
          <div class="item-pic"><img :src="it.img" :alt="it.name" /><span class="item-badge">{{ it.count }}</span></div>
          <span style="font-size:10px">{{ it.name }}</span>
        </button>
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
    <CheckinPhotoModal v-if="photoTask" :task="photoTask" @done="onPhotoDone" @close="photoTask=null" />

    <!-- 装饰(摆家具) -->
    <div v-if="decorOpen" class="attr-overlay" @click.self="decorOpen=false">
      <div class="attr-sheet" style="--ac:#6bffb0">
        <div style="font-size:17px;font-weight:700;margin-bottom:4px">🛋️ 装饰小窝</div>
        <div class="dim" style="font-size:12px;margin-bottom:12px">在🛍️商城买下家具后,这里点一下摆进窝里 / 收起来。</div>
        <div v-for="f in furns" :key="f.key" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08)">
          <div style="width:50px;height:50px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.05)">
            <img :src="f.img" :alt="f.name" :style="f.owned ? '' : 'filter:grayscale(1) brightness(.5)'" style="width:40px;height:40px;object-fit:contain" />
          </div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">{{ f.emoji }} {{ f.name }}</div>
            <div class="dim" style="font-size:11px">{{ f.owned ? (f.placed ? '已摆在窝里' : '已拥有,未摆出') : '未拥有 · 去🛍️商城购买' }}</div>
          </div>
          <button v-if="f.owned" class="btn-ghost" style="padding:6px 12px;font-size:12px"
                  :style="f.placed ? 'border-color:rgba(255,158,199,.4);color:#ffb3d9' : 'border-color:rgba(107,255,176,.4);color:#9bffcf'"
                  @click="toggleFurn(f)">{{ f.placed ? '收起' : '摆出' }}</button>
          <span v-else style="font-size:18px">🔒</span>
        </div>
        <button class="btn-accent" style="width:100%;margin-top:14px;padding:11px" @click="decorOpen=false">完成</button>
      </div>
    </div>

    <!-- 换房间 -->
    <div v-if="roomOpen" class="attr-overlay" @click.self="roomOpen=false">
      <div class="attr-sheet" style="--ac:#7c6bff">
        <div style="font-size:17px;font-weight:700;margin-bottom:4px">🏠 给小愿换个窝</div>
        <div class="dim" style="font-size:12px;margin-bottom:12px">在🛍️商城买下房间后,点一个搬进去~</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div v-for="r in rooms" :key="r.key" class="room-pick" :class="{ sel:r.selected, lock:!r.owned }" @click="pickRoom(r)">
            <img :src="r.img" :alt="r.name" :style="r.owned ? '' : 'filter:grayscale(1) brightness(.5)'" />
            <div class="room-pick-cap">
              <span>{{ r.emoji }} {{ r.name }}</span>
              <span v-if="r.selected" style="color:#6bffb0;font-size:11px">✓ 当前</span>
              <span v-else-if="!r.owned" class="dim" style="font-size:10px">🔒 商城</span>
            </div>
          </div>
        </div>
        <button class="btn-accent" style="width:100%;margin-top:14px;padding:11px" @click="roomOpen=false">关闭</button>
      </div>
    </div>

    <!-- 诚信分记录 -->
    <div v-if="creditOpen" class="attr-overlay" @click.self="creditOpen=false">
      <div class="attr-sheet" style="--ac:#ffd86b">
        <div style="font-size:17px;font-weight:700;margin-bottom:4px">⭐ 诚信分 · {{ creditRow().credit_score }}
          <span style="font-size:13px;font-weight:500;color:#ffd86b">· {{ trust.name }}</span></div>
        <div class="dim" style="font-size:12px;line-height:1.5;margin-bottom:12px">诚实打卡被家人确认 +3;如果虚报被发现会扣分。诚信分越高,信任等级越高 ⭐</div>
        <div v-if="!creditLogs.length" class="dim" style="text-align:center;padding:16px 0;font-size:13px">还没有诚信分记录~ 诚实打卡就会涨哦</div>
        <div v-for="t in creditLogs" :key="t.id" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
          <span style="font-weight:800;font-size:15px;min-width:34px" :style="{ color: t.delta>=0 ? '#6bffb0' : '#ff7a7a' }">{{ t.delta>=0?'+':'' }}{{ t.delta }}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px">{{ t.reason }}</div>
            <div class="dim" style="font-size:11px">{{ fmtDateTime(t.created_at) }}{{ userName(t.created_by) ? ' · ' + userName(t.created_by) : '' }}</div>
          </div>
        </div>
        <button class="btn-accent" style="width:100%;margin-top:14px;padding:11px" @click="creditOpen=false">知道啦</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 宠物窝:夜晚星空小房间,宠物坐在窝里 */
.pet-room { position: relative; height: 240px; border-radius: 18px; overflow: hidden; margin-top: 6px;
  background-size: cover; background-position: center 42%; transition: background-image .3s; }
.room-btn { position: absolute; top: 8px; right: 8px; z-index: 6; width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.25); background: rgba(20,16,32,.55); backdrop-filter: blur(4px);
  font-size: 16px; cursor: pointer; display: grid; place-items: center; }
.room-btn:active { transform: scale(.92); }
.decor-btn { right: 48px; }
.furn { position: absolute; z-index: 2; height: auto; object-fit: contain; pointer-events: none;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,.4)); }
.room-pick { position: relative; border-radius: 14px; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,.1); aspect-ratio: 3/2; }
.room-pick.sel { border-color: #ffd86b; box-shadow: 0 0 0 1px #ffd86b; }
.room-pick img { width: 100%; height: 100%; object-fit: cover; display: block; }
.room-pick-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 5px 8px; font-size: 12px; font-weight: 600;
  display: flex; justify-content: space-between; align-items: center; background: linear-gradient(transparent, rgba(10,8,20,.9)); }
.pet-room-glow { position: absolute; left: 50%; bottom: 16%; transform: translateX(-50%); width: 64%; height: 36%;
  background: radial-gradient(ellipse at center, rgba(8,5,18,.5), transparent 70%); pointer-events: none; }
.pet-slot { position: absolute; left: 0; right: 0; top: 0; height: 70%; display: flex; align-items: flex-end; justify-content: center; }
/* 道具栏 */
.item-btn { background: none; border: none; padding: 0; cursor: pointer; color: #fff; display: flex; flex-direction: column; align-items: center; gap: 3px; transition: transform .12s; }
.item-btn:active { transform: scale(.9); }
.item-btn.empty { opacity: .4; }
.item-pic { position: relative; width: 52px; height: 52px; border-radius: 13px; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 35%, rgba(255,216,107,.22), rgba(255,255,255,.05)); border: 1px solid rgba(255,255,255,.1); }
.item-pic img { width: 40px; height: 40px; object-fit: contain; }
.item-badge { position: absolute; top: -5px; right: -5px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
  background: #ff7a7a; color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; }
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
