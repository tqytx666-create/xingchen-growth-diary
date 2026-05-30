<script setup>
import { ref, computed } from 'vue'
import { db, pet, petAttrs } from '../../lib/store.js'
import { DEX, SKINS, RARE_TXT, dominant, STAGES } from '../../lib/petConfig.js'
import { formImage, skinImage } from '../../lib/petImages.js'
import PetAvatar from '../../components/pet/PetAvatar.vue'
import { fmtDateTime } from '../../lib/util.js'
import { toast } from '../../lib/toast.js'

const p = computed(() => pet())
const a = computed(() => petAttrs())
const tab = ref('dex')

const curForm = computed(() => {
  if (p.value.stage_idx >= 5) return 'god'
  if (p.value.stage_idx >= 3) return ({ wisdom: 'wisdom', cleanliness: 'clean', vitality: 'sport', charm: 'charm' })[dominant(a.value)]
  if (p.value.stage_idx >= 2) return 'grow'
  return p.value.stage_idx >= 1 ? 'puppy' : 'egg'
})
function pickSkin(sk) {
  if (!sk.unlock(a.value, p.value)) { toast('未解锁:需' + sk.why); return }
  p.value.skin = sk.key; toast(`已换上「${sk.t}」皮肤 🎨`)
}
const events = computed(() => db.pet_events.slice(0, 30))
</script>

<template>
  <div style="padding:14px 14px 90px">
    <div class="card" style="border-radius:28px;padding:16px;margin-bottom:14px;display:flex;flex-direction:column;align-items:center;
                background:radial-gradient(120% 80% at 50% 0%, rgba(124,107,255,.3), transparent 60%), rgba(0,0,0,.18)">
      <PetAvatar :pet="p" :attrs="a" :size="170" :interactive="false" />
      <div style="font-weight:700;margin-top:6px">{{ p.name }} · {{ p.species }}</div>
      <div class="dim" style="font-size:12px">{{ STAGES[p.stage_idx].name }} · Lv.{{ STAGES[p.stage_idx].lv }}</div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button v-for="t in [['dex','🐾 图鉴'],['skin','🎨 皮肤'],['log','📜 成长记录']]" :key="t[0]"
              class="btn-ghost" style="flex:1;padding:9px;font-size:13px"
              :style="tab===t[0] ? 'border-color:#ffd86b;color:#ffd86b' : ''" @click="tab=t[0]">{{ t[1] }}</button>
    </div>

    <div v-if="tab==='dex'" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div v-for="d in DEX" :key="d.key" class="card" style="padding:12px;text-align:center;position:relative"
           :style="d.key===curForm ? 'border-color:#ffd86b;box-shadow:0 0 0 1px #ffd86b' : (d.cond(p,a) ? '' : 'filter:grayscale(.6) brightness(.7)')">
        <div style="height:96px;display:grid;place-items:center">
          <img v-if="d.cond(p,a)" :src="formImage(d.key)" style="height:96px;object-fit:contain" />
          <span v-else style="font-size:40px">❔</span>
        </div>
        <h3 style="font-size:13px;margin:6px 0 2px">{{ d.cond(p,a) ? d.t : '???' }}</h3>
        <p class="dim" style="font-size:11px">{{ d.d }}</p>
        <span style="display:inline-block;font-size:9px;padding:2px 7px;border-radius:999px;margin-top:6px;font-weight:700;background:rgba(255,255,255,.12)">{{ RARE_TXT[d.rare] }}</span>
        <div v-if="d.key===curForm" style="position:absolute;top:8px;right:8px">📍</div>
        <div v-else-if="!d.cond(p,a)" style="position:absolute;top:8px;right:8px">🔒</div>
      </div>
    </div>

    <div v-else-if="tab==='skin'" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div v-for="sk in SKINS" :key="sk.key" class="card" style="padding:12px;text-align:center;position:relative;cursor:pointer"
           :style="p.skin===sk.key ? 'border-color:#ffd86b;box-shadow:0 0 0 1px #ffd86b' : (sk.unlock(a,p) ? '' : 'filter:grayscale(.6) brightness(.7)')"
           @click="pickSkin(sk)">
        <div style="height:96px;display:grid;place-items:center"><img :src="skinImage(sk.key)" style="height:96px;object-fit:contain" /></div>
        <h3 style="font-size:13px;margin:6px 0 2px">{{ sk.t }}</h3>
        <p class="dim" style="font-size:11px">{{ sk.d }}</p>
        <span style="display:inline-block;font-size:9px;padding:2px 7px;border-radius:999px;margin-top:6px;font-weight:700;background:rgba(255,216,107,.18);color:#ffd86b">{{ RARE_TXT[sk.rare] }}</span>
        <div v-if="p.skin===sk.key" style="position:absolute;top:8px;right:8px">✅</div>
        <template v-else-if="!sk.unlock(a,p)">
          <div style="position:absolute;top:8px;right:8px">🔒</div>
          <div style="font-size:10px;color:#ff7a7a;margin-top:4px">{{ sk.why }}</div>
        </template>
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
