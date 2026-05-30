<script setup>
import { computed } from 'vue'
import { mainImage } from '../../lib/petImages.js'
const props = defineProps({ pet: Object, attrs: Object, stage: Object })
const emit = defineEmits(['close'])
const src = computed(() => mainImage(props.pet, props.attrs))
</script>
<template>
  <div class="modal" @click.self="emit('close')">
    <div class="modal-card">
      <h2 style="font-size:22px;color:#ffd86b;margin-bottom:8px">进化! {{ stage.name }}</h2>
      <div style="width:180px;height:180px;margin:0 auto 14px">
        <img :src="src" alt="星愿犬" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 20px rgba(255,216,107,.6))" />
      </div>
      <p class="dim" style="font-size:14px;line-height:1.6;margin-bottom:18px">
        {{ pet.name }} 进化成了 {{ stage.name }}!继续坚持,它会变得更强大。
      </p>
      <button class="btn-accent" style="padding:12px 28px" @click="emit('close')">太棒了!</button>
    </div>
  </div>
</template>
