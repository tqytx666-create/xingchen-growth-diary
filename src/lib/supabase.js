import { createClient } from '@supabase/supabase-js'

// 与时间银行 / 台球账目系统共用同一个 Supabase 项目(cmswoyiuoeqzeassubvw)。
// 本应用的数据单独存在 xc_state 表(一行 jsonb),互不干扰。
const SUPABASE_URL = 'https://cmswoyiuoeqzeassubvw.supabase.co'
const SUPABASE_KEY = 'sb_publishable_kyhsOoWxO8YEBczAIJsUxQ_9KUmxFV2'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})
