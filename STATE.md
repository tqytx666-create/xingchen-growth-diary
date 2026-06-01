# 星晨成长日记 · 当前状态(上下文压缩存档)

## 部署
- 仓库 `tqytx666-create/xingchen-growth-diary`,本地 `~/Downloads/xingchen-growth-diary/`
- 线上 https://tqytx666-create.github.io/xingchen-growth-diary/ (push main 后 `bash deploy.sh` 推 gh-pages)
- 部署后必 curl 轮询确认 chunk 一致;**当前线上版 = `index-DRBWFsaX.js`(已上线最新)**
- 手机看不到更新=PWA 缓存,下拉刷新 2 次/清站点数据。SW 已改网络优先(v3)。
- 管理端密码 `xiaoyu2026`。GitHub 用钥匙串缓存 token(scope repo,无 workflow,故用 deploy.sh 不用 Actions)。

## 技术栈/数据
- Vue3+Vite+Tailwind,hash 路由,base './';数据层 `src/lib/store.js` 走 Supabase `xc_state` 单行 jsonb + Realtime 全家同步;SEED_VERSION 现为 **4**(改结构要升版本,旧存档自动重建)。
- Supabase 项目 `cmswoyiuoeqzeassubvw`(与台球账目/时间银行共用)。service_role key 能用;Storage bucket **`xc-photos` 已建好**(public,5MB,图片)——给拍照打卡用。
- 即梦 CLI:`dreamina`(已登录,maestro 会员,余额约 5860+,出图约 4 积分/张)。`dreamina text2image --prompt=.. --ratio=1:1 --poll=60`。
- 视频接入:纯黑底 mp4 → `mix-blend-mode:screen`+径向遮罩,放 `src/assets/anim/`;rembg 抠图工具可用(`U2NET_HOME=$HOME/.u2net`)。

## 已完成(上线)
- 30 级体系(英语每天≈3天升1级)、体型随级变大、5 阶段不同待机动画
- 真实美术:默认/智慧/香香/运动/神犬/低落/魅力犬/初遇蛋(即梦图,rembg 抠透明,`src/assets/pet/`)
- 视频动画:待机摇尾、刷牙/洗澡/读书/羽毛球互动、进化弹窗播进化视频(`src/lib/petAnims.js`)
- 打卡→家长核验→宠物页点道具互动才长属性放动画;时间银行家长端存取;星晨端🔄切换账号
- 自主升级循环做了 13 项(见 UPGRADE_LOG.md)
- 任务拆分(早上刷牙🌞/晚上刷牙🌙/洗澡🛁每天/洗头🚿3天/保持房间整洁🧹/羽毛球🏸)、签到页讲清"本周小奖励(自动到账)"vs"累积成就(去奖励页申请)"、视频修白闪方框
- **2026-06-01 这轮**:
  - 奖励数值改 满3天+10 / 满5天+20 / 满7天+50;**驱动从"英语天数"改成"支线全勤天数"**(全勤=当天 早刷牙+晚刷牙+洗澡+房间整洁 都打卡;洗头/羽毛球不计每日)。新增 `streakService.sideFullDays()`;签到页进度条与文案同步改成按全勤显示(原本 UI 按英语天数、发奖按全勤,已对齐)。
  - **银/金/钻宝箱**:rembg 抠透明缩 512² 入 `src/assets/box/`;`BoxModal.vue` 开箱动画(抖动→开盖发光→揭晓分钟),替换纯文字盲盒。银(早晚刷牙/房间)1~3、金(洗澡)2~5、钻(洗头)5~10。
  - **拍照打卡**:`CheckinPhotoModal.vue` 点打卡→模板提示(`photoHints.js`)→摄像头拍照→`photo.js` 浏览器压缩→传 Storage `xc-photos`→checkin.photo_url;家长 `Checkins.vue` 看图+点击放大。带"暂不拍照直接打卡"兜底、上传失败不挡打卡。**不接AI**。
  - **Storage 策略**:`xc-photos` 原本无 anon INSERT 策略,anon 上传 403。已加 `xc_photos_insert_anon`/`xc_photos_select_anon`(见 `db/001_xc_photos_anon_policy.sql`),anon 实测 200。
  - **修预存 bug**:互动时升级提示/进化弹窗取错字段(应为 `res.delta.{leveledUp,newLevel,tierUp}`),原来从不触发,已修。
  - **微信宠物不显示修复**:微信/QQ 安卓 X5 内核不支持视频内联自动播 + `mix-blend-mode` → 首页宠物空白。加 `petAnims.BLEND_VIDEO_OK` 检测,这类环境回落静态透明 PNG。

## 进行中/待做(按优先级)
1. 待补视频:低落/开心跳/神犬漂浮/宝箱开箱(即梦CLI生成)
2. (验证)微信 X5 宠物回落 — 需真机微信打开线上确认宠物已显示

## 注意
- 写日志/报告时 chunk 名必须 curl 实测,别凭记忆写(之前多次写错)。
- commit 用简单 -m,别用 heredoc(之前 heredoc 导致提交失败过)。
- 部署后务必轮询确认线上 chunk == 本地,别凭"pushed"就说上线。
