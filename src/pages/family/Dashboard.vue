<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, child, currentUser, setUser, pet, petAttrs, streak, credit, bank, mainTask } from '../../lib/store.js'
import { todayStr } from '../../lib/util.js'
import { levelInfo } from '../../services/creditService.js'
import { STAGES } from '../../lib/petConfig.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'

const router = useRouter()
const me = computed(() => currentUser())
const today = todayStr()
const mt = computed(() => mainTask())
const todayCheckins = computed(() => db.checkins.filter(c => c.checkin_date === today && c.status !== 'revoked'))
const englishToday = computed(() => mt.value && todayCheckins.value.find(c => c.task_id === mt.value.id))
const unverified = computed(() => db.checkins.filter(c => c.status === 'self_reported').length)
const pendingReq = computed(() => db.reward_requests.filter(r => r.status === 'pending').length)
const trust = computed(() => levelInfo(credit().credit_score))
const todoTotal = computed(() => unverified.value + pendingReq.value)

function logout() { setUser(null); router.push('/login') }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div><div class="dim" style="font-size:13px">家庭端</div><div style="font-weight:700;font-size:18px">{{ me?.avatar }} {{ me?.display_name }}</div></div>
      <button class="btn-ghost" style="padding:8px 12px;font-size:12px" @click="logout">退出</button>
    </div>

    <!-- 待办醒目横幅 -->
    <div v-if="todoTotal > 0" class="todo-banner" style="border-radius:16px;padding:13px 15px;margin-bottom:14px;display:flex;align-items:center;gap:10px;
         background:linear-gradient(135deg,rgba(255,122,122,.22),rgba(255,158,199,.12));border:1px solid rgba(255,122,122,.4)">
      <span class="dot-pulse" style="width:10px;height:10px;border-radius:50%;background:#ff7a7a;flex-shrink:0"></span>
      <div style="flex:1;font-size:14px;font-weight:600">需要你处理 <b style="color:#ff9ec7">{{ todoTotal }}</b> 件事</div>
      <span class="dim" style="font-size:12px">↓ 点下方卡片</span>
    </div>
    <div v-else class="card" style="padding:12px 15px;margin-bottom:14px;font-size:13px;color:#9bffcf;border-color:rgba(107,255,176,.3)">
      ✅ 暂时没有要处理的事,辛苦啦~
    </div>

    <div class="card" style="padding:16px;margin-bottom:14px"
         :style="englishToday ? 'border-color:rgba(107,255,176,.4)' : 'border-color:rgba(255,122,122,.4)'">
      <div style="font-size:14px" class="dim">今天的英语主线</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px" :style="englishToday ? 'color:#6bffb0' : 'color:#ff7a7a'">
        {{ englishToday ? '✅ 星晨已打卡' : '⚠️ 今天还没学英语' }}
      </div>
      <div v-if="englishToday && englishToday.status==='self_reported'" style="font-size:12px;margin-top:4px;color:#ffd86b">自报完成,待你核验 →</div>
      <div v-else-if="englishToday && englishToday.status==='confirmed'" class="dim" style="font-size:12px;margin-top:4px">已确认属实</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div class="card todo-card" style="padding:14px;cursor:pointer;position:relative;transition:all .2s"
           :style="unverified>0 ? 'border-color:#ffd86b;box-shadow:0 0 0 1px rgba(255,216,107,.4)' : ''"
           @click="router.push('/family/checkins')">
        <span v-if="unverified>0" class="dot-pulse" style="position:absolute;top:10px;right:10px;width:9px;height:9px;border-radius:50%;background:#ff7a7a"></span>
        <div style="font-size:26px;font-weight:800" :style="unverified>0 ? 'color:#ffd86b' : 'color:rgba(255,255,255,.4)'">{{ unverified }}</div>
        <div class="dim" style="font-size:12px">条自报待核验 {{ unverified>0 ? '→' : '' }}</div>
      </div>
      <div class="card todo-card" style="padding:14px;cursor:pointer;position:relative;transition:all .2s"
           :style="pendingReq>0 ? 'border-color:#ff9ec7;box-shadow:0 0 0 1px rgba(255,158,199,.4)' : ''"
           @click="router.push('/family/rewards')">
        <span v-if="pendingReq>0" class="dot-pulse" style="position:absolute;top:10px;right:10px;width:9px;height:9px;border-radius:50%;background:#ff7a7a"></span>
        <div style="font-size:26px;font-weight:800" :style="pendingReq>0 ? 'color:#ff9ec7' : 'color:rgba(255,255,255,.4)'">{{ pendingReq }}</div>
        <div class="dim" style="font-size:12px">个兑换待处理 {{ pendingReq>0 ? '→' : '' }}</div>
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

    <div class="card" style="padding:14px;display:flex;align-items:center;gap:14px;
         background:radial-gradient(120% 90% at 20% 0%, rgba(124,107,255,.22), transparent 60%), rgba(255,255,255,.04)">
      <div style="width:64px;height:64px;flex-shrink:0;display:grid;place-items:center">
        <PetAvatar :pet="pet()" :attrs="petAttrs()" :size="64" :interactive="false" :use-video="false" />
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600">{{ pet().name }} · {{ STAGES[pet().stage_idx ?? 0]?.name }}{{ (pet().stage_idx||0)<=0 ? ' · 待孵化' : ' · Lv.' + pet().level }}</div>
        <div class="dim" style="font-size:12px;margin-top:2px">智慧 {{ petAttrs().wisdom }} · 清洁 {{ petAttrs().cleanliness }} · 活力 {{ petAttrs().vitality }} · 魅力 {{ petAttrs().charm }}</div>
        <div v-if="(pet().stage_idx||0)<=0" class="dim" style="font-size:11px;margin-top:2px;color:#ffd86b">🥚 孵化进度 {{ pet().exp||0 }}/30</div>
      </div>
      <span v-if="pet().risk>=2" style="font-size:11px;color:#ff7a7a">退阶风险</span>
    </div>
  </div>
</template>

<style scoped>
.dot-pulse { animation: dotPulse 1.3s ease-in-out infinite; }
@keyframes dotPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,122,122,.5);} 50%{transform:scale(1.25);box-shadow:0 0 0 5px rgba(255,122,122,0);} }
.todo-card:active { transform: scale(.97); }
</style>
