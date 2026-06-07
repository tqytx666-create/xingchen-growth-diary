<script setup>
import { computed, ref } from 'vue'
import { db, currentUser } from '../../lib/store.js'
import * as vs from '../../services/verificationService.js'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'

const me = computed(() => currentUser())
const list = computed(() => db.checkins.slice(0, 80))
const lightbox = ref('')   // 放大查看的照片 URL
const STATUS = {
  self_reported: { t: '自报完成', c: '#ffd86b' }, confirmed: { t: '已确认', c: '#6bffb0' },
  false_reported: { t: '已标记虚报', c: '#ff7a7a' }, disputed: { t: '有争议', c: '#ff9ec7' }, revoked: { t: '已撤销', c: '#888' }
}
function task(c) { return db.tasks.find(t => t.id === c.task_id) }
function actor(id) { return db.users.find(u => u.id === id)?.display_name || '' }

// 外教课 / 运动确认:用内联弹窗收分钟(window.prompt 在 iOS 独立 PWA 里会被禁)
// mode: 'lesson'=外教课换游戏时间;'sport'=运动时长(换等量游戏时间,满60分钟开箱升钻石)
const minuteModal = ref(null)   // 待输入分钟的打卡
const minuteMode = ref('lesson')
const minuteVal = ref(45)
const minuteUI = computed(() => minuteMode.value === 'sport'
  ? { title: '🏃 确认运动打卡', tip: '运动了多久?换等量游戏时间存入时间银行(满 60 分钟那次开箱直升钻石宝箱)。', chips: [15, 30, 45, 60] }
  : { title: '📘 确认英语外教课', tip: '这节课换多少游戏时间?确认后自动存入时间银行。', chips: [25, 30, 45, 60] })
function confirm(c) {
  const t = task(c)
  if (t?.lesson) { minuteMode.value = 'lesson'; minuteVal.value = 45; minuteModal.value = c }
  else if (t?.category === 'sport') { minuteMode.value = 'sport'; minuteVal.value = 30; minuteModal.value = c }
  else { vs.confirm(c.id, me.value.id); toast('已确认属实 ✅') }
}
function doMinuteConfirm() {
  const c = minuteModal.value; if (!c) return
  const m = Math.max(0, Math.round(Number(minuteVal.value) || 0))
  vs.confirm(c.id, me.value.id, m)
  toast(m > 0 ? `已确认 ✅ 游戏时间 +${m} 分钟` : '已确认 ✅')
  minuteModal.value = null
}
// 标记虚报:同样用内联确认弹窗替代 window.confirm
const falseModal = ref(null)
function markFalse(c) { falseModal.value = c }
function doMarkFalse() {
  const c = falseModal.value; if (!c) return
  vs.markFalse(c.id, me.value.id); toast('已标记虚报 ⚠️'); falseModal.value = null
}
function dispute(c) { vs.dispute(c.id, me.value.id); toast('已标记争议') }
function revoke(c) { vs.revoke(c.id, me.value.id); toast('已撤销核验') }
// 误触取消:把孩子误点的"自报"打卡作废,不扣信任分,孩子可重新打卡
function cancelMisclick(c) { vs.revoke(c.id, me.value.id); toast('已取消这次打卡(误触,不扣分)') }
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
            <span v-if="task(c)?.lesson" style="font-size:10px;color:#8be9ff">外教课</span>
            <span v-if="task(c)?.category==='sport'" style="font-size:10px;color:#6bffb0">🏃运动</span>
            <span v-if="c.game_minutes" style="font-size:10px;color:#9fe4ff">+{{ c.game_minutes }}分钟</span>
            <span v-if="c.make_up" style="font-size:10px;color:#c79bff">📅补卡</span>
          </div>
          <div class="dim" style="font-size:11px">{{ c.checkin_date }} · 自报 {{ fmtDateTime(c.self_reported_at) }}</div>
        </div>
        <span style="font-size:12px;font-weight:600" :style="{ color: STATUS[c.status].c }">{{ STATUS[c.status].t }}</span>
      </div>
      <div v-if="c.make_up" style="font-size:12px;margin-top:8px;color:#ffd86b">🛡️ 免断签卡补卡 · 已自动接上连续天数(无需再核验)</div>
      <img v-else-if="c.photo_url" :src="c.photo_url" alt="打卡照片" loading="lazy"
           style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin-top:10px;cursor:zoom-in;background:rgba(255,255,255,.05)"
           @click="lightbox=c.photo_url" />
      <div v-else class="dim" style="font-size:11px;margin-top:8px">📷 本次没有上传照片</div>
      <div v-if="c.verified_by" class="dim" style="font-size:11px;margin-top:6px">由 {{ actor(c.verified_by) }} 处理</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button v-if="c.status!=='confirmed'" class="btn-ghost" style="padding:7px 12px;font-size:13px;border-color:rgba(107,255,176,.4);color:#9bffcf" @click="confirm(c)">确认属实</button>
        <button v-if="c.status!=='false_reported'" class="btn-ghost" style="padding:7px 12px;font-size:13px;border-color:rgba(255,122,122,.4);color:#ffb3b3" @click="markFalse(c)">标记虚报</button>
        <button class="btn-ghost" style="padding:7px 12px;font-size:13px" @click="dispute(c)">争议</button>
        <button v-if="c.status==='self_reported'" class="btn-ghost" style="padding:7px 12px;font-size:13px;border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.7)" @click="cancelMisclick(c)">✕ 取消(误触)</button>
        <button v-if="c.status!=='self_reported'" class="btn-ghost" style="padding:7px 12px;font-size:13px" @click="revoke(c)">撤销</button>
      </div>
    </div>

    <div v-if="lightbox" @click="lightbox=''"
         style="position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.9);display:grid;place-items:center;padding:16px;cursor:zoom-out">
      <img :src="lightbox" alt="打卡照片" style="max-width:100%;max-height:100%;border-radius:12px" />
    </div>

    <!-- 外教课 / 运动:确认并录分钟换游戏时间 -->
    <div v-if="minuteModal" class="ck-overlay" @click.self="minuteModal=null">
      <div class="ck-sheet">
        <div style="font-size:17px;font-weight:700;margin-bottom:4px">{{ minuteUI.title }}</div>
        <div class="dim" style="font-size:12px;margin-bottom:14px">{{ minuteUI.tip }}</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">
          <button v-for="p in minuteUI.chips" :key="p" class="ck-chip" :class="{ on: minuteVal==p }" @click="minuteVal=p">{{ p }}</button>
        </div>
        <input v-model.number="minuteVal" type="number" min="0" inputmode="numeric"
               style="text-align:center;font-size:18px;font-weight:700" />
        <div class="dim" style="font-size:11px;margin-top:6px">分钟{{ minuteMode==='sport' && Number(minuteVal)>=60 ? ' · 满60分钟,这次开箱升钻石宝箱 💎' : '' }}</div>
        <button class="btn-accent" style="width:100%;padding:11px;margin-top:14px" @click="doMinuteConfirm">确认 · 换 {{ Math.max(0, Math.round(Number(minuteVal)||0)) }} 分钟游戏时间</button>
        <button class="btn-ghost" style="width:100%;padding:9px;margin-top:8px" @click="minuteModal=null">取消</button>
      </div>
    </div>

    <!-- 标记虚报二次确认 -->
    <div v-if="falseModal" class="ck-overlay" @click.self="falseModal=null">
      <div class="ck-sheet">
        <div style="font-size:17px;font-weight:700;margin-bottom:4px">⚠️ 标记虚报</div>
        <div class="dim" style="font-size:13px;line-height:1.6;margin-bottom:16px">确定把「{{ task(falseModal)?.name }}」标记为虚报吗?会扣诚信分并影响宠物状态。</div>
        <button class="btn-accent" style="width:100%;padding:11px;background:linear-gradient(90deg,#ff7a7a,#ff9ec7);color:#fff" @click="doMarkFalse">确定标记虚报</button>
        <button class="btn-ghost" style="width:100%;padding:9px;margin-top:8px" @click="falseModal=null">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ck-overlay { position:fixed; inset:0; z-index:92; display:grid; place-items:center; padding:24px;
  background:rgba(6,4,16,.78); backdrop-filter:blur(4px); }
.ck-sheet { width:100%; max-width:320px; background:#14111f; border:1px solid rgba(255,255,255,.12);
  border-radius:22px; padding:20px; text-align:center; }
.ck-sheet input { width:100%; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.06); color:#fff; }
.ck-chip { padding:7px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.05); color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
.ck-chip.on { background:linear-gradient(90deg,#ffd86b,#ffb347); color:#1a1426; border-color:transparent; }
</style>
