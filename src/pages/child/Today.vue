<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db, pet, petAttrs, credit as creditRow, bank as bankRow, setUser } from '../../lib/store.js'
import { STAGES, isLow, MAX_LEVEL, expForLevel, tierFromLevel, TIER_START, HATCH_EXP, effectiveStage, DEX, charmTotal, CHARM_PER_SKIN, CHARM_PER_DEX } from '../../lib/petConfig.js'
import { levelInfo } from '../../services/creditService.js'
import * as checkinSvc from '../../services/checkinService.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'
import CountUp from '../../components/CountUp.vue'
import TaskRow from '../../components/child/TaskRow.vue'
import CoinIcon from '../../components/CoinIcon.vue'
import LivingPet from '../../components/pet/LivingPet.vue'
import { livingSet, actionForAnim } from '../../lib/living.js'
import { BLEND_VIDEO_OK } from '../../lib/petAnims.js'
import EvolutionModal from '../../components/pet/EvolutionModal.vue'
import CheckinPhotoModal from '../../components/CheckinPhotoModal.vue'
import { playTaskAnim, spawnFloaty, spawnBurst, magicCollect } from '../../lib/petFx.js'
import { pendingInterest, collectInterest } from '../../services/timeBankService.js'
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
// 魅力额外加成:拥有皮肤数 + 已解锁图鉴形态数
const skinCount = computed(() => (db.owned_skins || []).filter(k => k && k !== 'default').length)
const dexUnlocked = computed(() => DEX.filter(d => d.cond(p.value, a.value)).length)
const charmVal = computed(() => charmTotal(a.value.charm, skinCount.value, dexUnlocked.value))
const attrVal = (key) => key === 'charm' ? charmVal.value : a.value[key]

// 诚信分记录(点顶部"信任"徽章打开)
const creditOpen = ref(false)
const creditLogs = computed(() => (db.credit_transactions || []).slice(0, 40))
const userName = (id) => (id === 'system' ? '系统' : (db.users.find(u => u.id === id)?.display_name || ''))

// 活宠物:皮肤有活视频 + 默认房间 + 已孵化 + 状态正常 + 支持自动播视频(非微信)→ 启用
const livingSetCur = computed(() => livingSet(p.value))
const livingActive = computed(() => BLEND_VIDEO_OK && !!livingSetCur.value && (p.value.room || 'night') === 'night'
  && !isLow(p.value) && p.value.risk < 2)
const livingAction = ref('')
// 触发活宠物动作:先清空再设,确保连续同一个动作也能重播(watch 同值不触发)
function playLiving(a) { livingAction.value = ''; nextTick(() => { livingAction.value = a }) }

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
  playLiving(res.item.kind === 'feed' ? 'eat' : 'happy')   // 活宠物:喂食→吃,玩耍→开心
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
// 今日进度 + 把"还能打卡/待互动"的任务排前面,已完成的沉到底,主线优先
const taskPct = computed(() => tasks.value.length ? Math.round(doneCount.value / tasks.value.length * 100) : 0)
const allDone = computed(() => tasks.value.length > 0 && doneCount.value >= tasks.value.length)
const STATE_ORDER = { none: 0, ready: 0, wait: 1, dispute: 2, other: 2, false: 3, done: 4 }
const tasksSorted = computed(() => [...tasks.value].sort((x, y) => {
  const so = (STATE_ORDER[taskState(x)] ?? 2) - (STATE_ORDER[taskState(y)] ?? 2)
  return so || ((x.task_type === 'main' ? 0 : 1) - (y.task_type === 'main' ? 0 : 1))
}))
// 今日任务按类别分板块;英语合并成一个可展开入口(任一完成即主线)
function sortByState(arr) { return [...arr].sort((x, y) => (STATE_ORDER[taskState(x)] ?? 2) - (STATE_ORDER[taskState(y)] ?? 2)) }
const GROUP_DEF = [
  { key: 'english', emoji: '📚', name: '英语学习', cats: ['english'], main: true },
  { key: 'sport', emoji: '🏃', name: '运动', cats: ['sport'] },
  { key: 'life', emoji: '🧼', name: '生活习惯', cats: ['hygiene', 'chore'] },
  { key: 'hobby', emoji: '🎨', name: '兴趣', cats: ['hobby', 'interest'] }
]
const doneish = t => ['wait', 'ready', 'done'].includes(taskState(t))
const taskGroups = computed(() => {
  const used = new Set()
  const groups = GROUP_DEF.map(g => {
    const items = sortByState(tasks.value.filter(t => g.cats.includes(t.category)))
    items.forEach(t => used.add(t.id))
    const done = items.filter(doneish).length
    // 英语主线:任一完成即达标;其它类:全部完成才达标
    const allDone = g.main ? done > 0 : (items.length > 0 && done >= items.length)
    return { ...g, items, done, allDone }
  }).filter(g => g.items.length)
  const rest = sortByState(tasks.value.filter(t => !used.has(t.id)))
  if (rest.length) { const done = rest.filter(doneish).length; groups.push({ key: 'other', emoji: '📋', name: '其他', items: rest, done, allDone: done >= rest.length }) }
  return groups
})
const openGroup = ref(null)   // 点开的二级打卡页
// 弹窗打开时锁住背景滚动,避免滑动穿透到主页
watch(openGroup, v => { document.body.style.overflow = v ? 'hidden' : '' })
const trust = computed(() => levelInfo(creditRow().credit_score))
const coinBal = computed(() => coins())
// 每日利息:累计待收,孩子手动收取(魔法棒动效汇入时间余额)
const timeChipRef = ref(null)
const pendingItr = computed(() => pendingInterest())
function doCollectInterest(ev) {
  if (pendingItr.value <= 0) return
  magicCollect(ev.currentTarget, timeChipRef.value, () => {
    const got = collectInterest()
    if (got > 0) { sfx.pop && sfx.pop(); toast(`✨ 收取每日利息 +${got} 分钟游戏时间!`) }
  })
}

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
// 打卡成功的全屏彩屑(不依赖宠物 fx 容器,活宠物模式也能放)
function celebrate() {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden'
  const emojis = ['⭐', '✨', '🌟', '💫', '🎉', '🩷', '🐾']
  for (let i = 0; i < 20; i++) {
    const s = document.createElement('div')
    s.textContent = emojis[i % emojis.length]
    s.style.cssText = `position:absolute;left:${Math.random() * 100}vw;top:-32px;font-size:${15 + Math.random() * 16}px;will-change:transform,opacity;transition:transform 1.15s cubic-bezier(.2,.6,.3,1),opacity 1.15s ease-in;opacity:1`
    wrap.appendChild(s)
    requestAnimationFrame(() => { s.style.transform = `translateY(${72 + Math.random() * 26}vh) rotate(${Math.random() * 540 - 270}deg)`; s.style.opacity = '0' })
  }
  document.body.appendChild(wrap)
  setTimeout(() => wrap.remove(), 1350)
}
function onPhotoDone(photoUrl) {
  const t = photoTask.value
  photoTask.value = null
  if (!t) return
  try {
    const res = checkinSvc.createCheckin(t.id, { photoUrl })
    sfx.checkin()
    celebrate()
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
  playLiving(actionForAnim(res.task.anim))   // 活宠物:丝滑切到对应动作视频
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
  if (!isLow(p.value)) playLiving('happy')   // 活宠物:摸头→开心动作
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
        <button class="card" style="padding:6px 9px;font-size:14px;line-height:1" @click="snd=toggleSound()">{{ snd ? '🔊' : '🔇' }}</button>
        <button class="card" style="padding:6px 9px;font-size:14px;line-height:1" title="切换账号" @click="switchAccount">🔄</button>
      </div>
    </div>

    <!-- 宠物舞台 -->
    <div id="homeStage" class="card" style="position:relative;border-radius:28px;padding:16px;margin-bottom:12px;overflow:hidden"
         :style="p.risk>=2 ? 'background:radial-gradient(100% 80% at 50% 0%, rgba(255,122,122,.28), transparent 60%), rgba(40,10,20,.35)' : isLow(p) ? 'background:rgba(0,0,0,.3)' : 'background:radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.35), transparent 60%), rgba(0,0,0,.18)'">
      <div style="position:relative;z-index:6;display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div class="pet-id">
          <div class="pet-id-top">
            <span class="pet-id-name">{{ p.name }}</span>
            <span class="pet-id-lv">{{ isEgg ? '待孵化' : 'Lv.' + p.level }}</span>
          </div>
          <div class="pet-id-sub">{{ STAGES[effectiveStage(p)]?.name }} · {{ { normal:'心情不错 😊', happy:'超级开心 🥰', low:'有点低落 😔', disappointed:'有点失望 😞' }[p.mood] }}</div>
        </div>
        <div class="bal-card">
          <div ref="timeChipRef" class="bal-row" @click="router.push('/child/bank')">
            <span class="bal-ic">⏱️</span>
            <span class="bal-num" style="color:#8be9ff"><CountUp :value="Math.floor(bankRow().current_balance_minutes || 0)" /></span>
            <span class="bal-lb">分 · 时间银行</span>
          </div>
          <div class="bal-div"></div>
          <div class="bal-row" @click="router.push('/child/shop')">
            <CoinIcon class="bal-ic" />
            <span class="bal-num" style="color:#ffd86b"><CountUp :value="coinBal" /></span>
            <span class="bal-lb">星币 · 去商城</span>
          </div>
        </div>
      </div>
      <!-- 活宠物:在房间里溜达,互动时丝滑切到对应动作视频 -->
      <div v-if="livingActive" style="position:relative">
        <LivingPet :set="livingSetCur" :action="livingAction" @done="livingAction=''" @tap="petDog" />
        <button class="room-btn" title="换房间" @click.stop="roomOpen=true">🏠</button>
        <button class="room-btn decor-btn" title="装饰" @click.stop="decorOpen=true">🛋️</button>
      </div>
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

    <!-- 进化/状态提示(紧跟宠物) -->
    <div style="text-align:center;font-size:12px;line-height:1.55;margin:2px 6px 12px" :class="{ dim: !evoHint.warn }" v-html="evoHint.html"></div>

    <!-- 宠物属性(点开看说明)— 紧跟宠物 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:11px">
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='wisdom'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>🧠 智慧 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ a.wisdom }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#7c6bff,#b3a6ff)" :style="{width:bar(a.wisdom)}"></i></div></div>
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='cleanliness'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>🛁 清洁 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ a.cleanliness }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#6bd5ff,#a6f0ff)" :style="{width:bar(a.cleanliness)}"></i></div></div>
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='vitality'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>⚡ 活力 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ a.vitality }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#6bffb0,#b0ffd5)" :style="{width:bar(a.vitality)}"></i></div></div>
      <div class="card attr-card" style="padding:11px;cursor:pointer" @click="attrInfo='charm'"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>✨ 魅力 <span style="opacity:.5;font-size:11px">ⓘ</span></span><span class="dim">{{ charmVal }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#ff9ec7,#ffc7e0)" :style="{width:bar(charmVal)}"></i></div></div>
    </div>

    <!-- 道具栏(紧跟宠物) -->
    <div class="card" style="padding:11px 13px;margin-bottom:11px">
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

    <!-- 每日利息:攒着待收,点一下魔法棒星星汇入时间余额 -->
    <button v-if="pendingItr > 0" class="itr-collect" @click="doCollectInterest">
      <span class="itr-spark">✨</span>
      <span style="flex:1;text-align:left">小愿帮你攒了 <b>{{ pendingItr }}</b> 分钟利息</span>
      <span class="itr-go">点我收取 →</span>
    </button>

    <!-- 今日任务:分类卡片,点开二级页打卡 -->
    <div style="display:flex;align-items:center;margin:2px 2px 9px">
      <span style="font-size:16px;font-weight:700">📋 今日任务</span>
      <span v-if="allDone" style="margin-left:auto;font-size:12px;font-weight:700;color:#9bffcf">🎉 今天全部完成啦!</span>
      <span v-else class="dim" style="margin-left:auto;font-size:13px;font-weight:600">{{ doneCount }} / {{ tasks.length }}</span>
    </div>
    <div class="bar" style="margin:0 2px 14px;height:8px">
      <i style="background:linear-gradient(90deg,#6bffb0,#7c6bff)" :style="{ width: taskPct + '%' }"></i>
    </div>
    <div class="cat-grid">
      <button v-for="g in taskGroups" :key="g.key" class="cat-card" :class="{ cdone: g.allDone }" @click="openGroup = g">
        <span class="cat-emoji">{{ g.emoji }}</span>
        <div class="cat-name">{{ g.name }}<span v-if="g.main" class="cat-tag">主线</span></div>
        <div class="cat-sub" :class="{ ok: g.allDone }">{{ g.allDone ? '✓ 今日完成' : g.done + ' / ' + g.items.length + ' 已打卡' }}</div>
      </button>
    </div>

    <!-- 属性说明弹窗 -->
    <div v-if="attrInfo" class="attr-overlay" @click.self="attrInfo=null">
      <div class="attr-sheet" :style="{ '--ac': ATTR_META[attrInfo].color }">
        <div style="font-size:17px;font-weight:700;margin-bottom:6px">{{ ATTR_META[attrInfo].icon }} {{ ATTR_META[attrInfo].name }}
          <span style="font-size:13px;font-weight:500;color:var(--ac)">· 当前 {{ attrVal(attrInfo) }}</span>
        </div>
        <div class="dim" style="font-size:13px;line-height:1.55;margin-bottom:12px">{{ ATTR_META[attrInfo].blurb }}</div>
        <div v-if="attrInfo==='charm'" style="font-size:12.5px;line-height:1.6;margin:-4px 0 12px;padding:9px 11px;border-radius:11px;background:rgba(255,158,199,.12)">
          ✨ 还有额外加成:每拥有 <b style="color:var(--ac)">1 款皮肤 +{{ CHARM_PER_SKIN }}</b>、每解锁 <b style="color:var(--ac)">1 个图鉴形态 +{{ CHARM_PER_DEX }}</b>。<br>
          现在:皮肤 {{ skinCount }} 款(+{{ skinCount*CHARM_PER_SKIN }})· 形态 {{ dexUnlocked }} 个(+{{ dexUnlocked*CHARM_PER_DEX }})。越会打扮、收集越多,越有魅力~
        </div>
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

    <!-- 二级打卡页:点分类卡弹出,在这里分别打卡 -->
    <div v-if="openGroup" class="grp-overlay" @click.self="openGroup=null">
      <div class="grp-sheet">
        <div style="font-size:17px;font-weight:700;margin-bottom:3px">{{ openGroup.emoji }} {{ openGroup.name }}</div>
        <div v-if="openGroup.main" class="dim" style="font-size:12px;margin-bottom:12px">任意完成一个就算今日英语主线 ✓</div>
        <div v-else class="dim" style="font-size:12px;margin-bottom:12px">完成这些打卡,陪小愿一起成长~</div>
        <TaskRow v-for="t in openGroup.items" :key="t.id" :task="t" :state="taskState(t)" @do="doTask" />
        <button class="btn-accent" style="width:100%;margin-top:12px;padding:11px" @click="openGroup=null">完成</button>
      </div>
    </div>

    <EvolutionModal v-if="evoStage" :pet="p" :attrs="a" :stage="evoStage" :hatch="evoHatch" @close="evoStage=null; evoHatch=false" />
    <CheckinPhotoModal v-if="photoTask" :task="photoTask" @done="onPhotoDone" @close="photoTask=null" />

    <!-- 装饰(摆家具) -->
    <div v-if="decorOpen" class="attr-overlay" @click.self="decorOpen=false">
      <div class="attr-sheet" style="--ac:#6bffb0">
        <div style="font-size:17px;font-weight:700;margin-bottom:4px">🛋️ 装饰小窝</div>
        <div class="dim" style="font-size:12px;margin-bottom:12px">在🛍️商城买下家具后,这里点一下摆进窝里 / 收起来。<br>💡 摆好的家具会显示在「换房间🏠」里的其它房间(森林/海洋/太空…);默认的星空小窝是会动的场景,本身已经布置好啦~</div>
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
/* 宠物名片 + 房间 HUD(时间/星币) */
.pet-id { min-width: 0; background: rgba(10,8,22,.45); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(6px);
  border-radius: 14px; padding: 7px 12px; }
.pet-id-top { display: flex; align-items: baseline; gap: 7px; }
.pet-id-name { font-size: 15px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pet-id-lv { font-size: 11px; font-weight: 800; color: #1a1426; background: linear-gradient(90deg,#ffd86b,#ffb347); border-radius: 999px; padding: 1px 8px; flex-shrink: 0; }
.pet-id-sub { font-size: 11px; color: rgba(255,255,255,.65); margin-top: 3px; white-space: nowrap; }
/* 余额名片:跟宠物名片同款两行卡片(上行=时间银行,下行=星币) */
.bal-card { flex-shrink: 0; min-width: 116px; background: rgba(10,8,22,.45); border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(6px); border-radius: 14px; padding: 6px 12px; }
.bal-row { display: flex; align-items: center; gap: 5px; cursor: pointer; transition: transform .12s ease; padding: 1px 0; }
.bal-row:active { transform: scale(.95); }
.bal-ic { font-size: 15px; line-height: 1; display: inline-flex; align-items: center; }
.bal-num { font-size: 19px; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; }
.bal-lb { font-size: 10px; color: rgba(255,255,255,.55); white-space: nowrap; margin-left: 1px; }
.bal-div { height: 1px; background: rgba(255,255,255,.1); margin: 4px 0; }
/* 今日任务分类卡(像商城小卡)+ 二级打卡弹窗 */
.cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.cat-card { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 16px 10px; border-radius: 16px; cursor: pointer;
  background: radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.2), transparent 60%), rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1); color: #fff; transition: transform .12s ease; }
.cat-card:active { transform: scale(.96); }
.cat-card.cdone { border-color: rgba(107,255,176,.45); background: radial-gradient(120% 80% at 50% 0%, rgba(107,255,176,.16), transparent 60%), rgba(255,255,255,.04); }
.cat-emoji { font-size: 30px; line-height: 1; }
.cat-name { font-size: 14px; font-weight: 700; }
.cat-tag { font-size: 9px; font-weight: 700; color: #ffd86b; background: rgba(255,216,107,.2); border-radius: 999px; padding: 1px 6px; margin-left: 5px; vertical-align: 1px; }
.cat-sub { font-size: 11px; color: rgba(255,255,255,.6); }
.cat-sub.ok { color: #6bffb0; font-weight: 700; }
.grp-overlay { position: fixed; inset: 0; z-index: 72; display: grid; place-items: end center;
  background: rgba(6,4,16,.7); backdrop-filter: blur(3px); animation: af .2s ease; }
.grp-sheet { width: 100%; max-width: 460px; background: #14111f; border: 1px solid rgba(255,255,255,.12);
  border-radius: 22px 22px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0,0,0,.4); animation: sheetup .28s cubic-bezier(.2,1,.4,1); max-height: 82vh; overflow-y: auto; }
/* 每日利息收取条 */
.itr-collect { width: 100%; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 11px 14px;
  border: 1px solid rgba(255,216,107,.4); border-radius: 14px; cursor: pointer; color: #fff; font-size: 13px;
  background: linear-gradient(100deg, rgba(255,216,107,.18), rgba(139,233,255,.1));
  box-shadow: 0 0 16px -5px rgba(255,216,107,.7); animation: itrPulse 2s ease-in-out infinite; }
.itr-collect:active { transform: scale(.98); }
.itr-collect b { color: #ffd86b; font-size: 15px; }
.itr-spark { font-size: 18px; }
.itr-go { font-size: 12px; font-weight: 700; color: #ffd86b; white-space: nowrap; }
@keyframes itrPulse { 0%,100%{ box-shadow: 0 0 14px -6px rgba(255,216,107,.6) } 50%{ box-shadow: 0 0 20px -3px rgba(255,216,107,.85) } }
@media (prefers-reduced-motion: reduce){ .itr-collect{ animation: none } }
/* 今日任务:已完成/虚报淡出沉底,未完成的更醒目 */
.task-card { transition: opacity .25s ease, transform .12s ease; }
.task-card.tdone { opacity: .5; }
.task-card:active { transform: scale(.99); }
.attr-overlay { position: fixed; inset: 0; z-index: 70; display: grid; place-items: end center;
  background: rgba(6,4,16,.7); backdrop-filter: blur(3px); animation: af .2s ease; }
.attr-sheet { width: 100%; max-width: 460px; background: #14111f; border: 1px solid rgba(255,255,255,.12);
  border-radius: 22px 22px 0 0; padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0,0,0,.4); animation: sheetup .28s cubic-bezier(.2,1,.4,1); }
@keyframes af { from { opacity: 0 } to { opacity: 1 } }
@keyframes sheetup { from { transform: translateY(100%) } to { transform: translateY(0) } }
</style>
