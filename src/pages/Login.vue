<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { db, setUser } from '../lib/store.js'

const router = useRouter()
const pwd = ref('')
const pending = ref(null)
const err = ref('')
const ADMIN_PWD = 'xiaoyu2026'

function pick(u) {
  err.value = ''
  if (u.role === 'admin') { pending.value = u; return }
  enter(u)
}
function enter(u) {
  setUser(u.id)
  if (u.role === 'child') router.push('/child/today')
  else router.push('/family/dashboard')
}
function confirmAdmin() {
  if (pwd.value === ADMIN_PWD) { enter(pending.value) }
  else err.value = '密码不对哦'
}
</script>

<template>
  <div style="padding:24px 18px;min-height:100dvh;display:flex;flex-direction:column;justify-content:center">
    <div style="text-align:center;margin-bottom:28px">
      <div style="font-size:46px">🌟</div>
      <h1 style="font-size:26px;font-weight:800;margin-top:6px">星晨成长日记</h1>
      <p class="dim" style="font-size:14px;margin-top:6px">选择你是谁</p>
    </div>

    <div v-if="!pending" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <button v-for="u in db.users" :key="u.id" class="card" style="padding:18px;text-align:center"
              @click="pick(u)">
        <div style="font-size:34px">{{ u.avatar }}</div>
        <div style="font-weight:700;margin-top:6px">{{ u.display_name }}</div>
        <div class="dim" style="font-size:11px;margin-top:2px">
          {{ u.role === 'child' ? '星晨端' : u.role === 'admin' ? '管理员' : '家庭成员' }}
        </div>
      </button>
    </div>

    <div v-else class="card" style="padding:22px;text-align:center">
      <div style="font-size:34px">🔒</div>
      <div style="font-weight:700;margin:8px 0 4px">{{ pending.display_name }}(管理员)</div>
      <p class="dim" style="font-size:13px;margin-bottom:14px">请输入管理密码</p>
      <input type="password" v-model="pwd" placeholder="密码" style="text-align:center" @keyup.enter="confirmAdmin" />
      <div v-if="err" style="color:#ff7a7a;font-size:13px;margin-top:8px">{{ err }}</div>
      <button class="btn-accent" style="width:100%;padding:12px;margin-top:14px" @click="confirmAdmin">进入</button>
      <button class="btn-ghost" style="width:100%;padding:10px;margin-top:8px" @click="pending=null;pwd=''">返回</button>
    </div>

    <p class="dim" style="text-align:center;font-size:11px;margin-top:24px">默认信任 · 家庭事后核验</p>
  </div>
</template>
