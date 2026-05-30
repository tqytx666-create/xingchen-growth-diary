<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { dogSVG } from './dogSVG.js'
import { appearanceFor, isLow } from '../../lib/petConfig.js'

const props = defineProps({
  pet: { type: Object, required: true },
  attrs: { type: Object, required: true },
  size: { type: Number, default: 190 },
  happy: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true }
})
const emit = defineEmits(['pet'])

const html = computed(() => dogSVG(appearanceFor(props.pet, props.attrs)))
const stateClass = computed(() => {
  if (props.pet.risk >= 2) return 'risk'
  if (isLow(props.pet)) return 'low'
  if (props.happy) return 'happy'
  return ''
})

let blink = null
const root = ref(null)
onMounted(() => {
  blink = setInterval(() => {
    const eg = root.value && root.value.querySelector('.eyeGroup')
    if (!eg) return
    eg.style.transition = 'transform .12s'; eg.style.transformOrigin = '100px 78px'; eg.style.transform = 'scaleY(.1)'
    setTimeout(() => { if (eg) eg.style.transform = 'scaleY(1)' }, 130)
  }, 4200)
})
onUnmounted(() => clearInterval(blink))
</script>

<template>
  <div ref="root" class="dog" :class="stateClass"
       :style="{ width: size + 'px', height: size + 'px' }"
       @click="interactive && emit('pet')" v-html="html"></div>
</template>
