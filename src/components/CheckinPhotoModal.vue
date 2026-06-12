<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { lockScroll } from '../lib/scrollLock.js'
onMounted(() => lockScroll(true)); onUnmounted(() => lockScroll(false))   // 拍照弹窗锁背景滚动
import { photoHint } from '../lib/photoHints.js'
import { uploadCheckinPhoto } from '../lib/photo.js'
import { child } from '../lib/store.js'
import { todayStr } from '../lib/util.js'
import { toast } from '../lib/toast.js'

const props = defineProps({ task: { type: Object, required: true } })
// done(photoUrl|null) = 确认打卡(带或不带照片);close() = 取消不打卡
const emit = defineEmits(['done', 'close'])

const hint = computed(() => photoHint(props.task.id))
const fileInput = ref(null)      // 相机(capture)
const galleryInput = ref(null)   // 相册/文件(无 capture,可上传已有照片/笔记)
const previewUrl = ref('')
let picked = null
const uploading = ref(false)

function pickCamera() { fileInput.value?.click() }
function pickGallery() { galleryInput.value?.click() }
function onFile(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  picked = f
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(f)
}

async function confirm() {
  if (uploading.value) return
  if (!picked) { emit('done', null); return }   // 没拍照也允许直接打卡(兜底)
  uploading.value = true
  try {
    const url = await uploadCheckinPhoto(picked, {
      childId: child()?.id, taskId: props.task.id, date: todayStr()
    })
    emit('done', url)
  } catch (err) {
    console.warn('[photo] upload failed', err)
    toast('照片上传失败,已先帮你打卡 ✅')
    emit('done', null)   // 上传失败不挡打卡
  } finally {
    uploading.value = false
  }
}
function skip() { if (!uploading.value) emit('done', null) }
</script>

<template>
  <div class="cp-overlay" @click.self="!uploading && emit('close')">
    <div class="cp-card">
      <div class="cp-head">
        <span style="font-size:22px">{{ task.icon }}</span>
        <span style="font-weight:700;font-size:16px">{{ task.name }}</span>
      </div>

      <div v-if="hint" class="cp-hint">
        <div style="font-size:13px;font-weight:600;color:#ffd86b;margin-bottom:4px">{{ hint.emoji }} 拍一张:{{ hint.what }}</div>
        <div class="dim" style="font-size:12px;line-height:1.5">{{ hint.tip }}</div>
        <div class="dim" style="font-size:11px;margin-top:6px">📸 拍照让家人确认更快,也能记录成长~</div>
      </div>
      <div v-else class="cp-hint">
        <div class="dim" style="font-size:12px">完成后点下面打卡,等家人确认就能陪小愿玩啦</div>
      </div>

      <button class="cp-shot" :class="{ filled: previewUrl }" @click="pickCamera">
        <img v-if="previewUrl" :src="previewUrl" alt="预览" />
        <template v-else>
          <span style="font-size:30px">📷</span>
          <span style="font-size:13px;margin-top:4px">拍照,或从相册上传</span>
        </template>
      </button>
      <div class="cp-pick-row">
        <button class="cp-pick" @click="pickCamera">📷 拍照</button>
        <button class="cp-pick" @click="pickGallery">🖼️ 从相册上传</button>
      </div>
      <input ref="fileInput" type="file" accept="image/*" capture="environment" style="display:none" @change="onFile" />
      <input ref="galleryInput" type="file" accept="image/*" style="display:none" @change="onFile" />

      <button class="cp-go" :disabled="uploading" @click="confirm">
        {{ uploading ? '照片上传中…' : (previewUrl ? '确认打卡 ✅' : '打卡 ✅') }}
      </button>
      <div class="cp-skip" :class="{ disabled: uploading }" @click="skip" v-if="!previewUrl">暂不拍照,直接打卡</div>
      <div class="cp-skip" :class="{ disabled: uploading }" @click="!uploading && emit('close')" v-else>取消</div>
    </div>
  </div>
</template>

<style scoped>
.cp-overlay{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:20px;
  background:rgba(6,4,16,.78);backdrop-filter:blur(3px);animation:cpfade .2s ease}
.cp-card{width:100%;max-width:340px;background:#14111f;border:1px solid rgba(255,255,255,.12);
  border-radius:22px;padding:20px}
.cp-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.cp-hint{background:rgba(255,216,107,.08);border:1px solid rgba(255,216,107,.18);
  border-radius:14px;padding:12px;margin-bottom:14px}
.cp-shot{width:100%;aspect-ratio:4/3;border-radius:16px;border:2px dashed rgba(255,255,255,.25);
  background:rgba(255,255,255,.04);color:#fff;display:flex;flex-direction:column;align-items:center;
  justify-content:center;cursor:pointer;overflow:hidden;padding:0}
.cp-shot.filled{border-style:solid;border-color:rgba(107,255,176,.5)}
.cp-shot img{width:100%;height:100%;object-fit:cover}
.cp-pick-row{display:flex;gap:8px;margin-top:10px}
.cp-pick{flex:1;padding:9px;border:1px solid rgba(255,255,255,.18);border-radius:11px;background:rgba(255,255,255,.05);
  color:#fff;font-size:13px;font-weight:600;cursor:pointer}
.cp-pick:active{transform:scale(.97)}
.cp-go{width:100%;margin-top:16px;padding:13px;border:none;border-radius:14px;font-size:15px;
  font-weight:700;color:#0a1f3d;background:linear-gradient(90deg,#ffd86b,#ffb347);cursor:pointer}
.cp-go:disabled{opacity:.6;cursor:default}
.cp-skip{text-align:center;font-size:12px;color:rgba(255,255,255,.5);margin-top:12px;cursor:pointer}
.cp-skip.disabled{opacity:.4;cursor:default}
@keyframes cpfade{from{opacity:0}to{opacity:1}}
</style>
