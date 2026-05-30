<script setup>
import { computed } from 'vue'
import { mainImage } from '../../lib/petImages.js'
import { isLow } from '../../lib/petConfig.js'

const props = defineProps({
  pet: { type: Object, required: true },
  attrs: { type: Object, required: true },
  size: { type: Number, default: 190 },
  happy: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true }
})
const emit = defineEmits(['pet'])

const src = computed(() => mainImage(props.pet, props.attrs))
const stateClass = computed(() => {
  if (props.pet.risk >= 2) return 'risk'
  if (isLow(props.pet)) return 'low'
  if (props.happy) return 'happy'
  return ''
})
</script>

<template>
  <div class="dog" :class="stateClass" :style="{ width: size + 'px', height: size + 'px' }"
       @click="interactive && emit('pet')">
    <img :src="src" alt="星愿犬" draggable="false" />
  </div>
</template>
