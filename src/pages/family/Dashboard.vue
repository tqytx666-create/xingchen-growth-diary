<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, child, currentUser, setUser, pet, petAttrs, streak, credit, bank, mainTask } from '../../lib/store.js'
import { todayStr } from '../../lib/util.js'
import { levelInfo } from '../../services/creditService.js'
import { STAGES } from '../../lib/petConfig.js'

const router = useRouter()
const me = computed(() => currentUser())
const today = todayStr()
const mt = mainTask()
const todayCheckins = computed(() => db.checkins.filter(c => c.checkin_date === today && c.status !== 'revoked'))
const englishToday = computed(() => todayCheckins.value.find(c => c.task_id === mt.id))
const unverified = computed(() => db.checkins.filter(c => c.status === 'self_reported').length)
const pendingReq = computed(() => db.reward_requests.filter(r => r.status === 'pending').length)
const trust = computed(() => levelInfo(credit().credit_score))

function logout() { setUser(null); router.push('/login') }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div><div class="dim" style="font-size:13px">家庭端</div><div style="font-weight:700;font-size:18px">{{ me?.avatar }} {{ me?.display_name }}</div></div>
      <button class="btn-ghost" style="padding:8px 12px;font-size:12px" @click="logout">退出</button>
    </div>

    <div class="card" style="padding:16px;margin-bottom:14px"
         :style="englishToday ? 'border-color:rgba(107,255,176,.4)' : 'border-color:rgba(255,122,122,.4)'">
      <div style="font-size:14px" class="dim">今天的英语主线</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px" :style="englishToday ? 'color:#6bffb0' : 'color:#ff7a7a'">
        {{ englishToday ? '✅ 星晨已打卡' : '⚠️ 今天还没学英语' }}
      </div>
      <div v-if="englishToday && englishToday.status==='self_reported'" class="dim" style="font-size:12px;margin-top:4px">自报完成,待核验</div>
      <div v-else-if="englishToday && englishToday.status==='confirmed'" class="dim" style="font-size:12px;margin-top:4px">已确认属实</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div class="card" style="padding:14px;cursor:pointer" @click="router.push('/family/checkins')">
        <div style="font-size:26px;font-weight:800;color:#ffd86b">{{ unverified }}</div>
        <div class="dim" style="font-size:12px">条自报待核验</div>
      </div>
      <div class="card" style="padding:14px;cursor:pointer" @click="router.push('/family/rewards')">
        <div style="font-size:26px;font-weight:800;color:#ff9ec7">{{ pendingReq }}</div>
        <div class="dim" style="font-size:12px">个兑换待处理</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:26px;font-weight:800">{{ streak().current_streak }}</div>
        <div class="dim" style="font-size:12px">英语连续天数</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:26px;font-weight:800;color:#ffd86b">{{ credit().credit_score }}</div>
        <div class="dim" style="font-size:12px">诚信分 · {{ trust.name }}</div>
      </div>
    </div>

    <div class="card" style="padding:14px;display:flex;align-items:center;gap:12px">
      <div style="font-size:30px">🐾</div>
      <div style="flex:1">
        <div style="font-weight:600">{{ pet().name }} · {{ STAGES[pet().stage_idx].name }}</div>
        <div class="dim" style="font-size:12px">智慧 {{ petAttrs().wisdom }} · 清洁 {{ petAttrs().cleanliness }} · 活力 {{ petAttrs().vitality }} · 魅力 {{ petAttrs().charm }}</div>
      </div>
      <span v-if="pet().risk>=2" style="font-size:11px;color:#ff7a7a">退阶风险</span>
    </div>
  </div>
</template>
