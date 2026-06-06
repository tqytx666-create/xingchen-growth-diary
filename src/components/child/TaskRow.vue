<script setup>
// 单条打卡行(今日任务用)。state 由父级传入,操作通过 @do 上抛
defineProps({ task: Object, state: String })
defineEmits(['do'])
function pillText(t) { return t.category === 'english' ? '英语' : (t.task_type === 'main' ? '主线' : '支线') }
function pillStyle(t) {
  if (t.category === 'english') return 'background:rgba(124,200,255,.22);color:#9bd5ff'
  if (t.task_type === 'main') return 'background:rgba(255,216,107,.2);color:#ffd86b'
  return 'background:rgba(124,107,255,.25);color:#c3b8ff'
}
</script>

<template>
  <div class="card task-card" :class="{ tdone: ['done','false'].includes(state) }"
       :style="(task.task_type==='main' || task.category==='english') && state==='none' ? 'border-color:rgba(255,216,107,.4);background:linear-gradient(135deg,rgba(255,216,107,.12),rgba(255,255,255,.06))' : ''"
       style="display:flex;align-items:center;gap:12px;padding:12px 13px;margin-bottom:9px">
    <div style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:21px;background:rgba(124,107,255,.18)">{{ task.icon }}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:15px;font-weight:600">{{ task.name }}</div>
      <div class="dim" style="font-size:12px;margin-top:1px">{{ task.desc || (task.task_type==='main' ? '英语主线' : '支线') }}<span v-if="task.blindbox" style="color:#ffd86b"> · 🎁开宝箱</span></div>
      <span style="display:inline-block;font-size:10px;padding:2px 7px;border-radius:999px;margin-top:5px;font-weight:600" :style="pillStyle(task)">{{ pillText(task) }}</span>
    </div>
    <button v-if="state==='none'" class="btn-accent" style="padding:10px 15px" @click="$emit('do', task)">打卡</button>
    <span v-else-if="state==='wait'" style="font-size:12px;color:#ffd86b;text-align:center;line-height:1.4">⏳ 等家人<br>确认</span>
    <span v-else-if="state==='ready'" style="font-size:12px;color:#6bffb0;text-align:center;line-height:1.4">✨ 上去<br>陪小愿</span>
    <span v-else-if="state==='done'" style="font-size:12px;color:#6bffb0;text-align:center;line-height:1.4">✓ 已完成</span>
    <span v-else-if="state==='false'" style="font-size:12px;color:#ff7a7a;text-align:center;line-height:1.4">⚠️ 虚报</span>
    <span v-else style="font-size:12px;color:#ff9ec7;text-align:center">争议中</span>
  </div>
</template>
