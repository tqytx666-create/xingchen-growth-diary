<script setup>
import { computed } from 'vue'
import { db, currentUser } from '../../lib/store.js'
import * as vs from '../../services/verificationService.js'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'

const me = computed(() => currentUser())
const list = computed(() => db.checkins.slice(0, 80))
const STATUS = {
  self_reported: { t: '自报完成', c: '#ffd86b' }, confirmed: { t: '已确认', c: '#6bffb0' },
  false_reported: { t: '已标记虚报', c: '#ff7a7a' }, disputed: { t: '有争议', c: '#ff9ec7' }, revoked: { t: '已撤销', c: '#888' }
}
function task(c) { return db.tasks.find(t => t.id === c.task_id) }
function actor(id) { return db.users.find(u => u.id === id)?.display_name || '' }

function confirm(c) { vs.confirm(c.id, me.value.id); toast('已确认属实 ✅') }
function markFalse(c) { if (!window.confirm('确定标记为虚报?会扣诚信分并影响宠物。')) return; vs.markFalse(c.id, me.value.id); toast('已标记虚报 ⚠️') }
function dispute(c) { vs.dispute(c.id, me.value.id); toast('已标记争议') }
function revoke(c) { vs.revoke(c.id, me.value.id); toast('已撤销核验') }
</script>

<template>
  <div style="padding:14px 14px 90px">
    <h2 style="font-size:18px;font-weight:700;margin:4px 2px 14px;border-left:3px solid #ffd86b;padding-left:10px">✅ 打卡核验</h2>
    <div v-if="!list.length" style="text-align:center;padding:40px 0">
      <div style="font-size:46px;margin-bottom:8px">🐾</div>
      <div class="dim" style="font-size:14px">还没有打卡记录</div>
      <div class="dim" style="font-size:12px;margin-top:4px">等星晨完成任务后,这里会出现待核验的打卡</div>
    </div>
    <div v-for="c in list" :key="c.id" class="card" style="padding:13px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">{{ task(c)?.icon }}</span>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:600">{{ task(c)?.name }}
            <span v-if="task(c)?.task_type==='main'" style="font-size:10px;color:#ffd86b">主线</span>
          </div>
          <div class="dim" style="font-size:11px">{{ c.checkin_date }} · 自报 {{ fmtDateTime(c.self_reported_at) }}</div>
        </div>
        <span style="font-size:12px;font-weight:600" :style="{ color: STATUS[c.status].c }">{{ STATUS[c.status].t }}</span>
      </div>
      <div v-if="c.verified_by" class="dim" style="font-size:11px;margin-top:6px">由 {{ actor(c.verified_by) }} 处理</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button v-if="c.status!=='confirmed'" class="btn-ghost" style="padding:7px 12px;font-size:13px;border-color:rgba(107,255,176,.4);color:#9bffcf" @click="confirm(c)">确认属实</button>
        <button v-if="c.status!=='false_reported'" class="btn-ghost" style="padding:7px 12px;font-size:13px;border-color:rgba(255,122,122,.4);color:#ffb3b3" @click="markFalse(c)">标记虚报</button>
        <button class="btn-ghost" style="padding:7px 12px;font-size:13px" @click="dispute(c)">争议</button>
        <button v-if="c.status!=='self_reported'" class="btn-ghost" style="padding:7px 12px;font-size:13px" @click="revoke(c)">撤销</button>
      </div>
    </div>
  </div>
</template>
