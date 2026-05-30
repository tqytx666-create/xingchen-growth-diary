<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, pet, petAttrs, credit as creditRow, bank as bankRow, child } from '../../lib/store.js'
import { dominant, FORM_LABEL, STAGES, isLow } from '../../lib/petConfig.js'
import { levelInfo } from '../../services/creditService.js'
import * as checkinSvc from '../../services/checkinService.js'
import { nextCumulative } from '../../services/streakService.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'
import EvolutionModal from '../../components/pet/EvolutionModal.vue'
import { playTaskAnim, spawnFloaty } from '../../lib/petFx.js'
import { toast } from '../../lib/toast.js'

const p = computed(() => pet())
const a = computed(() => petAttrs())
const fx = ref(null)
const dogRef = ref(null)
const happy = ref(false)
const evoStage = ref(null)

const tasks = computed(() => db.tasks.filter(t => t.is_active))
const doneCount = computed(() => tasks.value.filter(t => checkinSvc.statusOf(t.id)).length)
const trust = computed(() => levelInfo(creditRow().credit_score))

const evoHint = computed(() => {
  if (p.value.risk >= 2) return { warn: true, html: `⚠️ 连续没完成英语,<b>${p.value.name}</b> 进入<b style="color:#ff7a7a">退阶风险</b>。连续学 3 天可解除。` }
  if (isLow(p.value)) return { warn: false, html: `今天 <b>${p.value.name}</b> 的能量弱了一些。明天补上英语,它还能重新变聪明 ✨` }
  const next = STAGES[p.value.stage_idx + 1]
  if (!next) return { warn: false, html: `<b>${p.value.name}</b> 已是最强形态 星愿神犬 🌟` }
  const total = a.value.wisdom + a.value.cleanliness + a.value.vitality + a.value.charm
  const need = Math.max(0, next.min - total)
  return { warn: false, html: `再积累 <b>${need}</b> 点成长值可进化 · 正在靠近 <b>${FORM_LABEL[dominant(a.value)]}</b>` }
})

function statusOf(id) { return checkinSvc.statusOf(id) }

function doTask(task) {
  if (statusOf(task.id)) return
  let minutes = 0
  if (task.id === 't_badminton') {
    const v = window.prompt('打了多少分钟羽毛球?(1 分钟 = 2 分钟游戏时间)', '30')
    if (v === null) return
    minutes = Math.max(0, parseInt(v) || 0)
  }
  try {
    const res = checkinSvc.createCheckin(task.id, { exerciseMinutes: minutes })
    playTaskAnim(fx.value, task.anim || animOf(task), dogRef.value?.$el)
    happy.value = true; setTimeout(() => (happy.value = false), 600)
    let msg = task.task_type === 'main' ? `英语打卡成功!智慧 +${task.base_exp} 🧠` : `${task.name}完成!`
    if (res.deposited) msg += ` · 时间银行 +${res.deposited}分`
    toast(msg)
    res.weeklyGranted.forEach(r => setTimeout(() => toast(`🎉 周签到达成 ${r.required_days} 天:${r.reward_name}`), 800))
    if (res.evolved) setTimeout(() => (evoStage.value = res.evolved), 700)
  } catch (e) { toast(e.message) }
}
function animOf(task) {
  return { english: 'study', teeth: 'brush', bath: 'bath', badminton: 'badminton' }[task.category === 'english' ? 'english' : task.id.replace('t_', '')] || 'study'
}
function petDog() {
  happy.value = !isLow(p.value); setTimeout(() => (happy.value = false), 600)
  spawnFloaty(fx.value, isLow(p.value) ? '💧' : '💛')
  toast(isLow(p.value) ? '小愿有点没精神…摸摸头 🥺' : '汪!摸摸头最开心了 🐾')
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
      <div style="display:flex;gap:8px">
        <span class="card" style="padding:6px 11px;font-size:13px;font-weight:600;color:#ffd86b">⭐ 信任 Lv.{{ trust.stars }}</span>
        <span class="card" style="padding:6px 11px;font-size:13px;font-weight:600">⏱️ {{ Math.floor(bankRow().current_balance_minutes) }}分</span>
      </div>
    </div>

    <!-- 宠物舞台 -->
    <div id="homeStage" class="card" :class="{}" style="position:relative;border-radius:28px;padding:16px;margin-bottom:14px;overflow:hidden"
         :style="p.risk>=2 ? 'background:radial-gradient(100% 80% at 50% 0%, rgba(255,122,122,.28), transparent 60%), rgba(40,10,20,.35)' : isLow(p) ? 'background:rgba(0,0,0,.3)' : 'background:radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.35), transparent 60%), rgba(0,0,0,.18)'">
      <div style="display:flex;justify-content:space-between">
        <span class="card" style="padding:5px 10px;border-radius:999px;font-size:12px;color:#ffd86b">{{ STAGES[p.stage_idx].name }} · Lv.{{ STAGES[p.stage_idx].lv }}</span>
        <span class="dim" style="font-size:12px">{{ { normal:'心情不错 😊', happy:'超级开心 🥰', low:'有点低落 😔', disappointed:'有点失望 😞' }[p.mood] }}</span>
      </div>
      <div style="display:flex;justify-content:center;align-items:flex-end;height:212px;position:relative">
        <PetAvatar ref="dogRef" :pet="p" :attrs="a" :happy="happy" @pet="petDog" />
        <div ref="fx" class="fx"></div>
      </div>
    </div>

    <div style="text-align:center;font-size:12px;line-height:1.55;margin:2px 6px 14px" :class="{ dim: !evoHint.warn }" v-html="evoHint.html"></div>

    <!-- 属性 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px">
      <div class="card" style="padding:11px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>🧠 智慧</span><span class="dim">{{ a.wisdom }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#7c6bff,#b3a6ff)" :style="{width:bar(a.wisdom)}"></i></div></div>
      <div class="card" style="padding:11px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>🛁 清洁</span><span class="dim">{{ a.cleanliness }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#6bd5ff,#a6f0ff)" :style="{width:bar(a.cleanliness)}"></i></div></div>
      <div class="card" style="padding:11px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>⚡ 活力</span><span class="dim">{{ a.vitality }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#6bffb0,#b0ffd5)" :style="{width:bar(a.vitality)}"></i></div></div>
      <div class="card" style="padding:11px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>✨ 魅力</span><span class="dim">{{ a.charm }}</span></div><div class="bar"><i style="background:linear-gradient(90deg,#ff9ec7,#ffc7e0)" :style="{width:bar(a.charm)}"></i></div></div>
    </div>

    <!-- 任务 -->
    <div style="font-size:15px;font-weight:700;margin:4px 2px 10px;display:flex;align-items:center">
      📋 今日任务 <span class="dim" style="margin-left:auto;font-size:12px;font-weight:500">{{ doneCount }}/{{ tasks.length }}</span>
    </div>
    <div v-for="t in tasks" :key="t.id" class="card"
         :style="t.task_type==='main' ? 'border-color:rgba(255,216,107,.4);background:linear-gradient(135deg,rgba(255,216,107,.12),rgba(255,255,255,.08))' : ''"
         style="display:flex;align-items:center;gap:12px;padding:13px;margin-bottom:10px"
         :class="{ }">
      <div style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:22px;background:rgba(124,107,255,.18)">{{ t.icon }}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:600">{{ t.name }}</div>
        <div class="dim" style="font-size:12px;margin-top:2px">{{ t.task_type==='main' ? '主线 · 智慧 + 连续签到' : '支线' }}</div>
        <span style="display:inline-block;font-size:10px;padding:2px 7px;border-radius:999px;margin-top:5px;font-weight:600"
              :style="t.task_type==='main' ? 'background:rgba(255,216,107,.2);color:#ffd86b' : 'background:rgba(124,107,255,.25);color:#c3b8ff'">
          {{ t.task_type==='main' ? '主线' : '支线' }}
        </span>
      </div>
      <button :disabled="!!statusOf(t.id)" @click="doTask(t)"
              class="btn-accent" style="padding:10px 15px"
              :style="statusOf(t.id) ? 'background:#6bffb0;color:#0a3d28' : ''">
        {{ statusOf(t.id) ? '✓ 已完成' : '打卡' }}
      </button>
    </div>

    <EvolutionModal v-if="evoStage" :pet="p" :attrs="a" :stage="evoStage" @close="evoStage=null" />
  </div>
</template>
