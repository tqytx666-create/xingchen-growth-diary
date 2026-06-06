# 星晨成长日记 — 交接文档(给下一个开发者/Agent)

> 给 12 岁王星晨做的家庭习惯养成 Web App:英语主线打卡 + 养成宠物(星愿犬)+ 金币商城 + 心愿兑换 + 家庭核验。已上线、在用。

---

## 0. 快速上手
```bash
cd xingchen-growth-diary
npm install
npm run dev        # 本地开发
npm run build      # 必须能过(部署前必跑)
bash deploy.sh     # 构建并把 dist 强推到 gh-pages 分支(GitHub Pages 发布)
```
- 线上:https://tqytx666-create.github.io/xingchen-growth-diary/
- 管理端密码 / 家长密码:`xiaoyu2026`(登录时家长账号要输;本机输一次后记住免密)
- 技术栈:Vue 3 + Vite + Tailwind,hash 路由,base `'./'`。无后端,数据全在 Supabase。

## 1. 部署(重要纪律)
- **不是 GitHub Actions**。流程:`git push origin main` → `bash deploy.sh`(它 `npm run build` 后把 `dist/` 强推到 `gh-pages` 分支,Pages 从该分支根目录发布)。
- GitHub 推送靠 macOS 钥匙串里 `tqytx666-create` 的 token(scope=repo,无 workflow,所以不用 Actions)。
- **每次部署后必须 curl 轮询线上 index chunk == 本地**才算真上线(别凭"pushed"就说上线):
```bash
grep -oE 'index-[A-Za-z0-9_-]+\.js' dist/index.html | head -1   # 本地 chunk
curl -sS "https://tqytx666-create.github.io/xingchen-growth-diary/?t=$(date +%s)" | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1   # 线上 chunk,等到一致
```
- 手机看不到更新 = PWA 缓存:下拉刷新 / 用 App 内右下角 🔄 刷新按钮 / 清站点数据。SW 已是网络优先。

## 2. 数据与同步(核心,务必看)
- 数据全部存在 Supabase **共享项目** `cmswoyiuoeqzeassubvw` 的 **`xc_state` 单行 jsonb 表**(`id=1`,字段 `data`)。不铺多表(该 Supabase 被台球账目/时间银行占了 60+ 张表,同名会冲突)。
- `src/lib/store.js` 是同步核心:`reactive db` 唯一数据源 → 本地 localStorage 缓存 + 防抖 `upsert` 到 `xc_state` + Realtime 订阅多端同步,last-write-wins。
- `src/lib/supabase.js` 用 anon publishable key(见凭据)。
- **`SEED_VERSION`(seed.js)**:目前为 5。**改 seed 结构 ≠ 改线上数据**!seed 只对全新安装生效;线上已存数据在 `xc_state.data` 里。
  - 改"已存数据的值"(如奖励数额、加任务)→ 用 **Supabase Management API `jsonb_set` 原地 patch**(见 `db/*.sql` 和下方凭据里的 `db-sql` 用法),**不要升 SEED_VERSION**(升级会重建种子、清空孩子全部进度!)。
  - 加新字段:代码里一律 `db.xxx || 默认` 兜底(老数据没有该字段)。仅结构性破坏变更才考虑升版本。
- Storage:`xc-photos` 桶(public,图片,5MB)存拍照打卡的图。anon 上传策略已加(见 `db/001_xc_photos_anon_policy.sql`)。

## 3. 美术/动画管线(即梦 + rembg + ffmpeg)
机器上有即梦官方 CLI `dreamina`(`~/.local/bin/dreamina`,已登录 VIP)、`rembg`(python 模块 + u2net 模型在 `~/.u2net`)、`ffmpeg`。
- **出图**:`dreamina text2image --prompt= --ratio=1:1 --poll=120`;**改装扮/形态保角色一致** 用 `dreamina image2image --images=src/assets/pet/pet_base.png --prompt="保持这只狗不变,加..." --model_version=4.0 --ratio=1:1 --poll=150`。
- **出视频**:`dreamina image2video --image=首帧.png --prompt= --model_version=3.0fast --duration=5 --video_resolution=720p --poll=240`。
  - ⚠️ **必须 `--model_version=3.0fast`**:默认模型需网页授权,否则报 `ret=1015 login error`(误导,不是真登录问题)。
  - 登录态偶尔失效:`dreamina relogin --headless` → 用户浏览器授权 → `dreamina login checklogin --device_code=...`(Agent 自己做不了授权,要用户)。
- **抠透明**:`rembg`(python `from rembg import remove,new_session`)→ 裁 bbox → 缩 512 → 存。
- **两类视频,处理方式不同**:
  - **叠加式动作/待机视频**(贴在深色舞台上,`mix-blend-mode:screen` 滤背景):**必须纯黑底** + 生成后过 `ffmpeg -vf "curves=all='0/0 0.10/0 1/1'"` 把近黑压成纯 0(否则有方框感)。喂图前把透明 PNG 合成到纯黑画布。
  - **活宠物全场景视频**(狗+房间烘焙在一起,见下):**不需要**黑底/压黑,直接全画面播。把宠物图合成进 `room_night.jpg` 当首帧再 image2video。
- 压缩入库:`ffmpeg -i x.mp4 -an -vf "scale=720:-2:flags=lanczos" -c:v libx264 -crf 26 -movflags +faststart out.mp4`。

## 4. 功能系统一览(代码位置)
- **宠物核心** `lib/petConfig.js`:`STAGES`(0蛋~6神犬)、`tierFromLevel`(Lv 1/3/5/8/12/18→形态,早期每2级进化)、`HATCH_EXP=30`(蛋孵化阈值)、`SKINS`/`DEX`。`services/petService.js`:`addExp`(含蛋孵化分支)、`applyTaskExp`、`applyItem`。`lib/petImages.js`:`STAGE_IMG`(形态图)、`SKIN_TRACK`/`SKIN_IMAGE`、`ROOM_TRACK`、`FURNITURE`。
- **活宠物(视频状态机)** `components/pet/LivingPet.vue` + `lib/living.js`:`FORM_SETS`{1:幼犬,2:星纹,3:翼星,...} 每形态一套全场景视频(idle/brush/study/bath/eat/happy),互动时交叉淡化切动作再淡回。**加新形态**:生成6段视频→存 `src/assets/living/scene_evoN_*.mp4`→`living.js` 加 `EVON` 并 `FORM_SETS[N]=EVON`。蛋/低落/换了非默认房间或皮肤/微信X5 → 回落静态 `PetAvatar.vue`。
- **金币经济** `services/coinService.js`:打卡互动赚星币(`shop.js` 的 COIN_PER_MAIN/SIDE),只能打卡赚。
- **商城** `pages/child/Shop.vue` + `services/shopService.js` + `lib/shop.js`(价格表)。皮肤/房间/家具 = 拥有制(`db.owned_skins/owned_rooms/owned_furniture`,`shopService.buy`),道具=消耗品。**加新可买内容必须在 shop.js 配价**。
- **心愿兑换**(实物:原耽小说/周边/阅读时间)`shop.js WISH` + `shopService.redeemWish`:扣星币→生成待家长兑现的 reward_request→家长「兑换」页通过(线下兑现)/拒绝(退星币)。
- **皮肤/房间/家具** `services/skinService/roomService/furnitureService.js`(都按 owned 判定;装扮在签到页衣柜、首页🏠换房间/🛋️装饰)。
- **任务&打卡** `lib/seed.js` tasks + `services/checkinService.js`:打卡→家长核验→孩子点道具互动长属性/开宝箱/赚币。`t_english`(英语自学,main)、6个支线、`t_english_class`(英语外教课,lesson:true,确认时家长输入换多少游戏时间)。
- **连续签到** `services/streakService.js`:`isMainStreakTask`= main 或 lesson(英语自学/外教课任一完成当天就算主线、连续不断)。
- **补卡**:① 免断签卡(签到页,消耗卡桥接英语连续);② 日历补卡(`pages/child/Calendar.vue` 热力图点某天→自报→家长核验,`checkinService.requestMakeup`)。
- **时间银行** `services/timeBankService.js` + `pages/child/Bank.vue`(游戏时间余额/流水/利息)。
- **诚信分** `services/creditService.js`(确认+3/虚报扣分,流水 `db.credit_transactions`,孩子端点顶部信任徽章看)。
- **宝箱**:支线互动获得入库(`db.boxes`),奖励页点开抽分钟+有几率掉道具。
- **登录** `pages/Login.vue`:孩子免密;家长账号要密码 `xiaoyu2026`,本机记住(`localStorage xc_parent_trust`),家长端「🔒锁定」可清除。
- **全局**`App.vue`:底部5标签(今日/宠物/签到/商城/奖励)、顶部安全区下压、右下🔄刷新按钮。

## 5. 数据模型(db.* 主要字段)
`users / tasks / checkins(含 photo_url/make_up/game_minutes) / pet_profile(level/exp/stage_idx/skin/room/mood/risk) / pet_attributes / streaks / weekly_reward_rules / weekly_claims / boxes / coins(数) / items(对象 key→数) / owned_skins/owned_rooms/owned_furniture(数组) / furniture(摆放开关) / credit_profile / credit_transactions / time_bank_accounts / time_bank_transactions / reward_requests / audit_logs / meta.version`

## 6. 踩过的坑(别重蹈)
1. **核验子代理(bug-hunter)会自信误报 P0** —— 改前先读代码核实(它两次把正确的 `res.delta`、champ皮肤判成 bug)。
2. **黑底视频**:叠加视频白底会被 screen 混合成白方块;务必纯黑底+压黑。活宠物全场景视频则不用。
3. **seed≠线上**:见第 2 节,改值用 Management API patch,别升 SEED_VERSION。
4. **微信安卓 X5**:不支持视频内联自动播+mix-blend-mode → `lib/petAnims.js BLEND_VIDEO_OK` 检测,回落静态图。活宠物同理(回落静态)。
5. **部署后必 curl 验证 chunk**。

## 7. 待办 / 下一步(迭代池)
- 活宠物高阶形态动画补齐:辉光犬(stage4/Lv8)、御星犬(stage5/Lv12)、神犬(stage6/Lv18)——每个一套全场景视频接进 `FORM_SETS`。
- 更多皮肤(image2image,记得 shop.js 配价)、会动的皮肤(`SKIN_IDLE`)。
- 宠物窝更多家具/房间主题、自由拖拽摆放。
- 道具使用动画升级、商城商品详情大图、开箱随机金币、持续 UX 巡查。

## 8. 凭据
见同目录 `HANDOFF_CREDENTIALS.md`(敏感,别公开)。
