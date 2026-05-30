<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, bank, currentUser, resetDB, setUser } from '../../lib/store.js'
import * as bankSvc from '../../services/timeBankService.js'
import { toast } from '../../lib/toast.js'

const router = useRouter()
const me = computed(() => currentUser())
const b = computed(() => bank())

// 时间银行:存入 / 扣除 / 奖励
const depType = ref('badminton')
const depMin = ref('')
const spendMin = ref('')
const spendNote = ref('')
const bonusMin = ref('')
const bonusNote = ref('')

const depPreview = computed(() => {
  const n = Number(depMin.value); if (!(n > 0)) return 0
  return depType.value === 'badminton' ? n * 2 : n
})

function toggleTask(t) { t.is_active = !t.is_active; toast(`${t.name} 已${t.is_active ? '启用' : '停用'}`) }
function toggleInterest() { b.value.interest_enabled = !b.value.interest_enabled; toast(`每日利息已${b.value.interest_enabled ? '开启' : '关闭'}`) }

function deposit() {
  const n = parseInt(depMin.value); if (!(n > 0)) return toast('请输入运动分钟数')
  bankSvc.deposit({ exerciseType: depType.value, exerciseMinutes: n, description: depType.value === 'badminton' ? `羽毛球 ${n} 分钟` : `其他运动 ${n} 分钟`, createdBy: me.value.id })
  toast(`已为星晨存入 ${depPreview.value} 分钟 💰`); depMin.value = ''
}
function spend() {
  const n = parseInt(spendMin.value); if (!(n > 0)) return toast('请输入分钟数')
  try { bankSvc.spendMinutes({ minutes: n, description: spendNote.value || `游戏使用 ${n} 分钟`, createdBy: me.value.id }); toast(`已扣除 ${n} 分钟 🎮`); spendMin.value = ''; spendNote.value = '' }
  catch (e) { toast(e.message) }
}
function bonus() {
  const n = parseInt(bonusMin.value); if (!(n > 0)) return toast('请输入分钟数')
  bankSvc.addBonus({ minutes: n, description: bonusNote.value || '额外奖励', createdBy: me.value.id }); toast(`已奖励 ${n} 分钟 🎁`); bonusMin.value = ''; bonusNote.value = ''
}
function doReset() { if (!window.confirm('确定重置所有数据?不可恢复!')) return; resetDB(); toast('已重置'); router.push('/login') }
function logout() { setUser(null); router.push('/login') }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h2 style="font-size:18px;font-weight:700;border-left:3px solid #ffd86b;padding-left:10px">⚙️ 管理配置</h2>
      <button class="btn-ghost" style="padding:8px 12px;font-size:12px" @click="logout">退出</button>
    </div>

    <!-- 时间银行管理 -->
    <div class="card" style="padding:16px;margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:4px">⏱️ 时间银行(家长操作)</div>
      <div class="dim" style="font-size:12px;margin-bottom:12px">当前余额 <b style="color:#ffd86b">{{ Math.floor(b.current_balance_minutes) }}</b> 分钟</div>

      <div class="dim" style="font-size:12px;margin-bottom:6px">① 运动存入</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn-ghost" style="flex:1;padding:9px;font-size:13px" :style="depType==='badminton' ? 'border-color:#ffd86b;color:#ffd86b' : ''" @click="depType='badminton'">🏸 羽毛球 1:2</button>
        <button class="btn-ghost" style="flex:1;padding:9px;font-size:13px" :style="depType==='other' ? 'border-color:#ffd86b;color:#ffd86b' : ''" @click="depType='other'">🏃 其他 1:1</button>
      </div>
      <div style="display:flex;gap:8px">
        <input type="number" inputmode="numeric" v-model="depMin" placeholder="运动分钟数,比如 90" />
        <button class="btn-accent" style="padding:0 16px;white-space:nowrap" @click="deposit">存入</button>
      </div>
      <div v-if="depPreview>0" class="dim" style="font-size:12px;margin-top:6px">将存入 <b style="color:#6bffb0">{{ depPreview }}</b> 分钟游戏时间</div>

      <div class="dim" style="font-size:12px;margin:14px 0 6px">② 扣除游戏时间</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input type="number" inputmode="numeric" v-model="spendMin" placeholder="使用分钟数" />
        <button class="btn-ghost" style="padding:0 16px;white-space:nowrap;border-color:rgba(255,122,122,.4);color:#ffb3b3" @click="spend">扣除</button>
      </div>
      <input type="text" v-model="spendNote" placeholder="备注(可选)" />

      <div class="dim" style="font-size:12px;margin:14px 0 6px">③ 额外奖励时间</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input type="number" inputmode="numeric" v-model="bonusMin" placeholder="奖励分钟数" />
        <button class="btn-ghost" style="padding:0 16px;white-space:nowrap" @click="bonus">奖励</button>
      </div>
      <input type="text" v-model="bonusNote" placeholder="备注(可选)" />

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1)">
        <span style="font-size:14px">每日 1% 利息</span>
        <button class="btn-ghost" style="padding:6px 14px;font-size:13px" :style="b.interest_enabled ? 'border-color:#6bffb0;color:#9bffcf' : 'opacity:.5'" @click="toggleInterest">{{ b.interest_enabled ? '开启' : '关闭' }}</button>
      </div>
    </div>

    <!-- 任务配置 -->
    <div class="card" style="padding:16px;margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:10px">任务配置</div>
      <div v-for="t in db.tasks" :key="t.id" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <span style="font-size:20px">{{ t.icon }}</span>
        <div style="flex:1"><div style="font-size:14px">{{ t.name }}</div><div class="dim" style="font-size:11px">{{ t.task_type==='main'?'主线':'支线' }} · {{ t.attribute_key }} +{{ t.base_exp }}</div></div>
        <button class="btn-ghost" style="padding:6px 12px;font-size:12px" :style="t.is_active ? 'border-color:#6bffb0;color:#9bffcf' : 'opacity:.5'" @click="toggleTask(t)">{{ t.is_active ? '启用中' : '已停用' }}</button>
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:6px">家庭成员</div>
      <div v-for="u in db.users" :key="u.id" class="dim" style="font-size:13px;padding:4px 0">{{ u.avatar }} {{ u.display_name }} — {{ u.role==='child'?'星晨':u.role==='admin'?'管理员':'家庭成员' }}</div>
    </div>

    <button class="btn-ghost" style="width:100%;padding:12px;border-color:rgba(255,122,122,.5);color:#ffb3b3" @click="doReset">🔄 重置所有数据</button>
  </div>
</template>
