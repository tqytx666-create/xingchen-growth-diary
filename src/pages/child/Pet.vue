<script setup>
import { ref, computed } from 'vue'
import { db, pet, petAttrs } from '../../lib/store.js'
import { DEX, SKINS, RARE_TXT, STAGES, FORMS, effectiveStage } from '../../lib/petConfig.js'
import { formImage, skinImage } from '../../lib/petImages.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'
import { skinTrackState, equipSkin } from '../../services/skinService.js'

const p = computed(() => pet())
const a = computed(() => petAttrs())
const tab = ref('dex')

// 改昵称
const editing = ref(false)
const nameInput = ref('')
function startEdit() { nameInput.value = p.value.name; editing.value = true }
function saveName() {
  const v = (nameInput.value || '').trim().slice(0, 6)
  if (v && v !== p.value.name) { p.value.name = v; toast(`好耶!从今天起它叫「${v}」🐾`) }
  editing.value = false
}

// 当前显示中的形态(玩家可在图鉴里切换已解锁形态)
const curForm = computed(() => FORMS[effectiveStage(p.value)].key)
function pickSkin(sk) {
  if (!sk.unlock(a.value, p.value)) { toast('未解锁:需' + sk.why); return }
  p.value.skin = sk.key; toast(`已换上「${sk.t}」皮肤 🎨`)
}
// 图鉴点击已解锁形态 → 切换显示形象(点当前等级形态则恢复默认跟随等级)
function pickForm(i, d) {
  if (i === 0) return                                  // 蛋不可选
  if (!d.cond(p.value, a.value)) { toast('这个形态还没解锁哦,继续升级解锁 ✨'); return }
  const hadSkin = p.value.skin && p.value.skin !== 'default'
  if (hadSkin) p.value.skin = 'default'   // 选图鉴形态 → 自动脱下皮肤,显示这个形态
  p.value.displayForm = (i === (p.value.stage_idx || 0)) ? null : i
  toast(hadSkin ? `已脱下皮肤,切换成「${d.t}」形态` : `已把小愿的形象切换成「${d.t}」`)
}
const events = computed(() => db.pet_events.slice(0, 30))
// 图鉴收集进度
const dexTotal = computed(() => DEX.length)
const dexUnlocked = computed(() => DEX.filter(d => d.cond(p.value, a.value)).length)
const dexPct = computed(() => dexTotal.value ? Math.round(dexUnlocked.value / dexTotal.value * 100) : 0)

// 皮肤衣柜(商城购买的皮肤,在这里装扮)
const wardrobe = computed(() => skinTrackState())
const ownedWardrobe = computed(() => wardrobe.value.filter(s => s.owned))
const ownedSkinCount = computed(() => ownedWardrobe.value.length)
function equipFromPet(s) {
  if (!s.owned) { toast(`还没拥有 ${s.emoji}${s.name},去 🛍️ 商城用星币买下它`); return }
  equipSkin(s.equipped ? 'default' : s.key)
  toast(s.equipped ? '已脱下装扮,变回原来的样子' : `已给小愿穿上「${s.name}」${s.emoji}`)
}
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div class="card" style="border-radius:28px;padding:16px;margin-bottom:14px;display:flex;flex-direction:column;align-items:center;
                background:radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.3), transparent 60%), rgba(0,0,0,.18)">
      <div class="pet-hero">
        <div class="pet-pedestal"></div>
        <div class="pet-float"><PetAvatar :pet="p" :attrs="a" :size="170" :interactive="false" /></div>
      </div>
      <div v-if="!editing" style="font-weight:700;margin-top:6px;display:flex;align-items:center;gap:6px;cursor:pointer" @click="startEdit">
        <span>{{ p.name }}</span><span class="dim" style="font-weight:400">· {{ p.species }}</span>
        <span style="font-size:12px;opacity:.7">✏️</span>
      </div>
      <div v-else style="margin-top:6px;display:flex;align-items:center;gap:6px">
        <input v-model="nameInput" maxlength="6" placeholder="起个昵称" style="width:120px;text-align:center;padding:6px 8px;font-size:14px"
               @keyup.enter="saveName" @blur="saveName" />
        <button class="btn-accent" style="padding:6px 12px;font-size:13px" @click="saveName">保存</button>
      </div>
      <div class="dim" style="font-size:12px">{{ STAGES[effectiveStage(p)]?.name }}{{ (p.stage_idx||0)<=0 ? ' · 待孵化' : ' · Lv.' + p.level }}</div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button v-for="t in [['dex','🐾 图鉴'],['skin','🎨 皮肤'],['log','📜 成长记录']]" :key="t[0]"
              class="btn-ghost" style="flex:1;padding:9px;font-size:13px"
              :style="tab===t[0] ? 'border-color:#ffd86b;color:#ffd86b' : ''" @click="tab=t[0]">{{ t[1] }}</button>
    </div>

    <div v-if="tab==='dex'">
    <div class="dex-prog">
      <span style="font-size:13px;font-weight:700;white-space:nowrap">🐾 图鉴收集 <b style="color:#ffd86b">{{ dexUnlocked }}</b><span class="dim">/{{ dexTotal }}</span></span>
      <div class="bar" style="flex:1"><i style="background:linear-gradient(90deg,#ffd86b,#ffb347)" :style="{ width: dexPct + '%' }"></i></div>
    </div>
    <div class="dim" style="font-size:11px;margin:0 2px 10px">点已解锁的形态,就能把小愿换成那个样子(脱掉皮肤才看得到形态哦)~</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div v-for="(d,i) in DEX" :key="d.key" class="card form-cell" :style="d.key===curForm ? 'border-color:#ffd86b;box-shadow:0 0 0 1px #ffd86b' : (d.cond(p,a) ? '' : 'filter:grayscale(.6) brightness(.7)')"
           :class="{ pickable: d.cond(p,a) && i>0 }" @click="pickForm(i,d)">
        <div style="height:96px;display:grid;place-items:center">
          <img v-if="d.cond(p,a)" :src="formImage(d.key)" loading="lazy" decoding="async" style="height:96px;object-fit:contain" />
          <span v-else style="font-size:40px">❔</span>
        </div>
        <h3 style="font-size:13px;margin:6px 0 2px">{{ d.cond(p,a) ? d.t : '???' }}</h3>
        <p class="dim" style="font-size:11px">{{ d.d }}</p>
        <span style="display:inline-block;font-size:9px;padding:2px 7px;border-radius:999px;margin-top:6px;font-weight:700;background:rgba(255,255,255,.12)">{{ RARE_TXT[d.rare] }}</span>
        <div v-if="d.key===curForm" style="position:absolute;top:8px;right:8px;font-size:10px;color:#1a1426;background:#ffd86b;border-radius:999px;padding:1px 7px;font-weight:700">显示中</div>
        <div v-else-if="!d.cond(p,a)" style="position:absolute;top:8px;right:8px">🔒</div>
        <div v-else style="position:absolute;top:8px;right:8px;font-size:10px;color:#ffd86b">点我换</div>
      </div>
    </div>
    </div>

    <div v-else-if="tab==='skin'">
      <div style="display:flex;align-items:center;margin:0 2px 11px">
        <span class="dim" style="font-size:12px">点一下就给小愿穿上 / 脱下</span>
        <span class="dim" style="margin-left:auto;font-size:12px;font-weight:600">已拥有 {{ ownedSkinCount }}/{{ wardrobe.length }}</span>
      </div>
      <div v-if="ownedWardrobe.length" class="pskin-grid">
        <div v-for="s in ownedWardrobe" :key="s.key" class="pskin-cell" :class="{ equipped:s.equipped }" @click="equipFromPet(s)">
          <div class="pskin-pic">
            <img :src="s.img" :alt="s.name" loading="lazy" decoding="async" />
            <span v-if="s.animated" class="pskin-anim">✨动</span>
            <span v-if="s.equipped" class="pskin-on">装扮中</span>
          </div>
          <div class="pskin-nm">{{ s.emoji }} {{ s.name }}</div>
          <div class="pskin-act">{{ s.equipped ? '点击脱下' : '点击装扮' }}</div>
        </div>
      </div>
      <div v-else class="dim" style="text-align:center;padding:30px 14px;font-size:13px;line-height:1.7">
        还没有皮肤呢~<br>去 🛍️ 商城用打卡攒的星币买喜欢的皮肤,买了就出现在这里 ✨
      </div>
    </div>

    <div v-else>
      <div v-if="!events.length" class="dim" style="text-align:center;padding:30px 0">还没有成长记录,去打卡吧 ✨</div>
      <div v-for="e in events" :key="e.id" class="card" style="padding:11px 13px;margin-bottom:8px">
        <div style="font-size:13px">{{ e.message }}</div>
        <div class="dim" style="font-size:11px;margin-top:2px">{{ fmtDateTime(e.created_at) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 图鉴形态卡:已解锁的可点切换 */
.form-cell { padding: 12px; text-align: center; position: relative; transition: transform .12s ease; }
.form-cell.pickable { cursor: pointer; }
.form-cell.pickable:active { transform: scale(.96); }
/* 宠物主图:轻轻浮动 + 下方光晕台座 */
.pet-hero { position: relative; display: grid; place-items: center; padding-top: 6px; }
.pet-pedestal { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%);
  width: 130px; height: 26px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255,216,107,.4), transparent 70%); filter: blur(2px); }
.pet-float { position: relative; animation: petFloat 3.4s ease-in-out infinite; }
@keyframes petFloat { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-7px) } }
/* 图鉴收集进度条 */
.dex-prog { display: flex; align-items: center; gap: 11px; margin: 2px 2px 14px; }
/* 皮肤衣柜:商城同款小格(3列) */
.pskin-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.pskin-cell { text-align: center; cursor: pointer; transition: transform .12s ease; }
.pskin-cell:active { transform: scale(.95); }
.pskin-pic { position: relative; width: 100%; aspect-ratio: 1; border-radius: 14px; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 35%, rgba(124,107,255,.22), rgba(255,255,255,.05)); border: 1px solid rgba(255,255,255,.1); }
.pskin-cell.equipped .pskin-pic { border-color: #ffd86b; box-shadow: 0 0 0 1px #ffd86b, 0 0 12px -2px #ffd86b; }
.pskin-pic img { width: 82%; height: 82%; object-fit: contain; }
.pskin-lock { position: absolute; inset: 0; display: grid; place-items: center; font-size: 22px; }
.pskin-anim { position: absolute; top: 3px; left: 3px; font-size: 9px; font-weight: 700; color: #1a1426;
  background: linear-gradient(90deg,#8be9ff,#c79bff); border-radius: 999px; padding: 1px 6px; }
.pskin-on { position: absolute; bottom: 0; left: 0; right: 0; font-size: 10px; font-weight: 700; color: #1a1426; background: #ffd86b; padding: 1px 0; }
.pskin-nm { font-size: 11px; font-weight: 600; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pskin-act { font-size: 10px; color: #ffd86b; margin-top: 1px; }
.pskin-act.dim { color: rgba(255,255,255,.4); }
@media (prefers-reduced-motion: reduce) { .pet-float { animation: none } }
</style>
