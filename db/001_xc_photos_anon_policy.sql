-- 拍照打卡:允许前端 anon publishable key 上传到 Storage 桶 xc-photos。
-- 背景:本 App 无登录体系,全程使用 anon key(与 xc_state 单行 jsonb 的 anon 读写一致)。
--       xc-photos 桶已 public、限图片、5MB,但 storage.objects 默认无 INSERT 策略 → anon 上传被 RLS 拒(403)。
-- 影响范围:仅 bucket_id = 'xc-photos',不触及账目系统的表与其他桶。
-- 执行方式:Supabase Management API(database/query)或 Dashboard SQL Editor。

drop policy if exists "xc_photos_insert_anon" on storage.objects;
create policy "xc_photos_insert_anon"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'xc-photos');

drop policy if exists "xc_photos_select_anon" on storage.objects;
create policy "xc_photos_select_anon"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'xc-photos');
