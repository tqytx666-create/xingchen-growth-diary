import { supabase } from './supabase.js'
import { uid } from './util.js'

const BUCKET = 'xc-photos'
const MAX_EDGE = 1280   // 长边压到 1280px
const QUALITY = 0.82

// 把用户拍的照片在浏览器端等比压缩成 jpeg blob,避免上传原图(手机拍照常 3~8MB)
function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width: w, height: h } = img
      if (Math.max(w, h) > MAX_EDGE) {
        const r = MAX_EDGE / Math.max(w, h)
        w = Math.round(w * r); h = Math.round(h * r)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('压缩失败')), 'image/jpeg', QUALITY)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')) }
    img.src = url
  })
}

// 压缩并上传到 Supabase Storage,返回可公开访问的 URL
export async function uploadCheckinPhoto(file, { childId, taskId, date }) {
  const blob = await compress(file)
  const path = `${childId || 'child'}/${date}_${taskId}_${uid()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg', upsert: false
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
