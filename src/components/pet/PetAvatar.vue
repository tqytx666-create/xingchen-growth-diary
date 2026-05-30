<script setup>
import { computed } from 'vue'
import { mainImage } from '../../lib/petImages.js'
import { isLow, sizeForLevel, animClassForLevel } from '../../lib/petConfig.js'

const props = defineProps({
  pet: { type: Object, required: true },
  attrs: { type: Object, required: true },
  size: { type: Number, default: 0 },          // 0 = 按等级自动
  happy: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true }
})
const emit = defineEmits(['pet'])

const src = computed(() => mainImage(props.pet, props.attrs))
const px = computed(() => props.size || sizeForLevel(props.pet.level || 1))
const idleClass = computed(() => animClassForLevel(props.pet.level || 1))
const stateClass = computed(() => {
  if (props.pet.risk >= 2) return 'risk'
  if (isLow(props.pet)) return 'low'
  if (props.happy) return 'happy'
  return ''
})
</script>

<template>
  <div class="dog" :class="[idleClass, stateClass]" :style="{ width: px + 'px', height: px + 'px' }"
       @click="interactive && emit('pet')">
    <img :src="src" alt="星愿犬" draggable="false" />
  </div>
</template>
