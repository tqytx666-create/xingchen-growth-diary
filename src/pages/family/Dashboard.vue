<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db, child, currentUser, setUser, pet, petAttrs, streak, credit, bank } from '../../lib/store.js'
import { todayStr } from '../../lib/util.js'
import { levelInfo, manualAdjust } from '../../services/creditService.js'
import { isMainStreakTask } from '../../services/streakService.js'
import { toast } from '../../lib/toast.js'
import { STAGES, DEX, charmTotal, healthState, HEALTH_MAX } from '../../lib/petConfig.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'

const router = useRouter()
const me = computed(() => currentUser())
const today = todayStr()
const todayCheckins = computed(() => db.checkins.filter(c => c.checkin_date === today && c.status !== 'revoked'))
// 英语主线:三项(自学/外教课/每日作业)任一完成即算今天主线过了(与连签 isMainStreakTask 口径一致)
const englishToday = computed(() => {
  const eng = todayCheckins.value.filter(c => isMainStreakTask(db.tasks.find(t => t.id === c.task_id)))
  return eng.find(c => c.status === 'confirmed') || eng.find(c => c.status === 'self_reported') || eng[0] || null
})
const unverified = computed(() => db.checkins.filter(c => c.status === 'self_reported').length)
const pendingReq = computed(() => db.reward_requests.filter(r => r.status === 'pending').length)
const trust = computed(() => levelInfo(credit().credit_score))
const todoTotal = computed(() => unverified.value + pendingReq.value)

// 信任分手动调整(扣分/恢复):内联弹窗(不用 window.prompt,iOS PWA 会禁)
const adjOpen = ref(false)
const adjDelta = ref(-10)
const adjReason = ref('')
const PRESET = [
  { d: -5, t: '小提醒 −5', r: '小提醒' },
  { d: -10, t: '不守约 −10', r: '没遵守约定' },
  { d: -20, t: '严重 −20', r: '严重违规' },
  { d: 5, t: '表现好 +5', r: '表现好,恢复信任' }
]
function openAdj() { adjOpen.value = true; adjDelta.value = -10; adjReason.value = '' }
function pickPreset(p) { adjDelta.value = p.d; if (!adjReason.value) adjReason.value = p.r }
function doAdj() {
  const d = Math.round(Number(adjDelta.value) || 0)
  if (d === 0) { toast('请选择扣/加的分数'); return }
  manualAdjust(d, adjReason.value.trim(), me.value.id)
  toast(`${d < 0 ? '已扣' : '已加'} ${Math.abs(d)} 信任分 · 当前 ${credit().credit_score}`)
  adjOpen.value = false
}

function logout() { setUser(null); router.push('/login') }
// 锁定本机:清掉"免密信任",下次进家长端要重新输密码(把手机给孩子前用)
function lockDevice() {
  localStorage.removeItem('xc_parent_trust')
  setUser(null); router.push('/login')
}
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div><div class="dim" style="font-size:13px">家庭端</div><div style="font-weight:700;font-size:18px">{{ me?.avatar }} {{ me?.display_name }}</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn-ghost" style="padding:8px 11px;font-size:12px" title="清除本机免密,下次需重新输密码" @click="lockDevice">🔒 锁定</button>
        <button class="btn-ghost" style="padding:8px 12px;font-size:12px" @click="logout">退出</button>
      </div>
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
      <div class="card" style="padding:14px;cursor:pointer;position:relative" @click="openAdj">
        <div style="font-size:26px;font-weight:800;color:#ffd86b">{{ credit().credit_score }}</div>
        <div class="dim" style="font-size:12px">诚信分 · {{ trust.name }}</div>
        <div style="position:absolute;top:8px;right:10px;font-size:11px;color:#8be9ff">调整 ›</div>
      </div>
    </div>

    <div class="card" style="padding:14px;display:flex;align-items:center;gap:14px;
         background:radial-gradient(120% 90% at 20% 0%, rgba(124,107,255,.22), transparent 60%), rgba(255,255,255,.04)">
      <div style="width:64px;height:64px;flex-shrink:0;display:grid;place-items:center">
        <PetAvatar :pet="pet()" :attrs="petAttrs()" :size="64" :interactive="false" :use-video="false" />
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600">{{ pet().name }} · {{ STAGES[pet().stage_idx ?? 0]?.name }}{{ (pet().stage_idx||0)<=0 ? ' · 待孵化' : ' · Lv.' + pet().level }}</div>
        <div class="dim" style="font-size:12px;margin-top:2px">智慧 {{ petAttrs().wisdom }} · 清洁 {{ petAttrs().cleanliness }} · 活力 {{ petAttrs().vitality }} · 魅力 {{ charmTotal(petAttrs().charm, (db.owned_skins||[]).filter(k=>k&&k!=='default').length, DEX.filter(d=>d.cond(pet(),petAttrs())).length) }} · 自律 {{ Math.round((petAttrs().discipline||0) + ((streak()?.longest_streak)||0)) }}</div>
        <div v-if="(pet().stage_idx||0)<=0" class="dim" style="font-size:11px;margin-top:2px;color:#ffd86b">🥚 孵化进度 {{ pet().exp||0 }}/30</div>
        <div v-else style="font-size:11px;margin-top:3px">
          <span :style="{ color: healthState(pet())==='sick' ? '#ff7a7a' : healthState(pet())==='weak' ? '#ffb347' : '#6bffb0' }">❤️ 健康 {{ Math.round(pet().health==null?HEALTH_MAX:pet().health) }}/100</span>
          <span v-if="healthState(pet())==='sick'" style="color:#ff7a7a;font-weight:700"> · 🤒 生病了,提醒孩子打卡照顾</span>
          <span v-else-if="healthState(pet())==='weak'" style="color:#ffb347"> · 状态下滑,久不打卡会生病</span>
        </div>
      </div>
      <span v-if="healthState(pet())==='sick'" style="font-size:11px;color:#ff7a7a;font-weight:700">🤒 生病</span>
      <span v-else-if="pet().risk>=2" style="font-size:11px;color:#ff7a7a">退阶风险</span>
    </div>

    <!-- 信任分调整弹窗(扣分/恢复) -->
    <div v-if="adjOpen" class="adj-overlay" @click.self="adjOpen=false">
      <div class="adj-sheet">
        <div style="font-size:17px;font-weight:700;margin-bottom:3px">🛡️ 调整信任分</div>
        <div class="dim" style="font-size:12px;margin-bottom:14px">当前 <b style="color:#ffd86b">{{ credit().credit_score }}</b> · {{ trust.name }}。扣分会影响宠物信任能量,谨慎使用。</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <button v-for="p in PRESET" :key="p.t" class="adj-chip" :class="{ on: adjDelta===p.d, plus: p.d>0 }" @click="pickPreset(p)">{{ p.t }}</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span class="dim" style="font-size:13px">分数</span>
          <input v-model.number="adjDelta" type="number" inputmode="numeric" style="flex:1;text-align:center;font-size:18px;font-weight:700;padding:8px;border-radius:10px" />
          <span class="dim" style="font-size:12px">负=扣 / 正=加</span>
        </div>
        <input v-model="adjReason" placeholder="原因(会记录在诚信分流水里)" style="width:100%;padding:10px;border-radius:10px;font-size:14px" />
        <button class="btn-accent" style="width:100%;padding:11px;margin-top:14px" :style="adjDelta<0 ? 'background:linear-gradient(90deg,#ff7a7a,#ff9ec7);color:#fff' : ''" @click="doAdj">
          {{ adjDelta<0 ? '确认扣 '+Math.abs(adjDelta)+' 分' : '确认加 '+adjDelta+' 分' }}
        </button>
        <button class="btn-ghost" style="width:100%;padding:9px;margin-top:8px" @click="adjOpen=false">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dot-pulse { animation: dotPulse 1.3s ease-in-out infinite; }
@keyframes dotPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,122,122,.5);} 50%{transform:scale(1.25);box-shadow:0 0 0 5px rgba(255,122,122,0);} }
.todo-card:active { transform: scale(.97); }
/* 信任分调整弹窗 */
.adj-overlay { position: fixed; inset: 0; z-index: 92; display: grid; place-items: center; padding: 24px;
  background: rgba(6,4,16,.78); backdrop-filter: blur(4px); }
.adj-sheet { width: 100%; max-width: 340px; background: #14111f; border: 1px solid rgba(255,255,255,.12);
  border-radius: 22px; padding: 20px; }
.adj-sheet input { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.18); color: #fff; box-sizing: border-box; }
.adj-chip { padding: 10px 8px; border-radius: 12px; border: 1px solid rgba(255,122,122,.35); background: rgba(255,122,122,.1);
  color: #ffb3b3; font-size: 13px; font-weight: 700; cursor: pointer; }
.adj-chip.plus { border-color: rgba(107,255,176,.4); background: rgba(107,255,176,.1); color: #9bffcf; }
.adj-chip.on { outline: 2px solid currentColor; }
</style>
