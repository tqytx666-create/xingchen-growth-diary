<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, bank, currentUser, resetDB, setUser } from '../../lib/store.js'
import * as bankSvc from '../../services/timeBankService.js'
import { toast } from '../../lib/toast.js'

const router = useRouter()
const me = computed(() => currentUser())
const b = computed(() => bank())
const bonusMin = ref('')
const otherMin = ref('')

function toggleTask(t) { t.is_active = !t.is_active; toast(`${t.name} 已${t.is_active ? '启用' : '停用'}`) }
function toggleInterest() { b.value.interest_enabled = !b.value.interest_enabled; toast(`每日利息已${b.value.interest_enabled ? '开启' : '关闭'}`) }
function addBonus() {
  const n = parseInt(bonusMin.value); if (!(n > 0)) return toast('请输入分钟')
  bankSvc.addBonus({ minutes: n, description: '管理员奖励', createdBy: me.value.id }); bonusMin.value = ''; toast(`已奖励 ${n} 分钟 🎁`)
}
function depositOther() {
  const n = parseInt(otherMin.value); if (!(n > 0)) return toast('请输入分钟')
  bankSvc.deposit({ exerciseType: 'other', exerciseMinutes: n, description: '其他运动存入', createdBy: me.value.id }); otherMin.value = ''; toast(`已存入 ${n} 分钟`)
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

    <div class="card" style="padding:16px;margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:10px">任务配置</div>
      <div v-for="t in db.tasks" :key="t.id" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <span style="font-size:20px">{{ t.icon }}</span>
        <div style="flex:1"><div style="font-size:14px">{{ t.name }}</div><div class="dim" style="font-size:11px">{{ t.task_type==='main'?'主线':'支线' }} · {{ t.attribute_key }} +{{ t.base_exp }}</div></div>
        <button class="btn-ghost" style="padding:6px 12px;font-size:12px" :style="t.is_active ? 'border-color:#6bffb0;color:#9bffcf' : 'opacity:.5'" @click="toggleTask(t)">{{ t.is_active ? '启用中' : '已停用' }}</button>
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:10px">时间银行规则</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:14px">每日 1% 利息</span>
        <button class="btn-ghost" style="padding:6px 14px;font-size:13px" :style="b.interest_enabled ? 'border-color:#6bffb0;color:#9bffcf' : 'opacity:.5'" @click="toggleInterest">{{ b.interest_enabled ? '开启' : '关闭' }}</button>
      </div>
      <div class="dim" style="font-size:12px;margin-top:8px">当前余额 {{ Math.floor(b.current_balance_minutes) }} 分钟</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <input type="number" v-model="bonusMin" placeholder="奖励分钟" />
        <button class="btn-accent" style="padding:0 16px;white-space:nowrap" @click="addBonus">奖励</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="number" v-model="otherMin" placeholder="其他运动分钟(1:1)" />
        <button class="btn-ghost" style="padding:0 16px;white-space:nowrap" @click="depositOther">存入</button>
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:6px">家庭成员</div>
      <div v-for="u in db.users" :key="u.id" class="dim" style="font-size:13px;padding:4px 0">{{ u.avatar }} {{ u.display_name }} — {{ u.role==='child'?'星晨':u.role==='admin'?'管理员':'家庭成员' }}</div>
    </div>

    <button class="btn-ghost" style="width:100%;padding:12px;border-color:rgba(255,122,122,.5);color:#ffb3b3" @click="doReset">🔄 重置所有数据</button>
  </div>
</template>
