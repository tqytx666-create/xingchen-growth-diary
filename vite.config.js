import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' + hash router → 适配 GitHub Pages 项目子目录
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: { outDir: 'dist' }
})
