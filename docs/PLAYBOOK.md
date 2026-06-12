# 星晨成长日记 · 工作 Playbook(成功经验沉淀)

> 南哥要"做得好的沉淀成经验,下次直接拿出来用"。这是把反复验证有效的打法固化下来,下次开工照着做。

## 0. 节奏(南哥的风格)
- **大方向先讨论 + 出 POC**,每步上线验证,内容滚动迭代,网页能立刻预览。
- **阶段性梳理**:别闷头干,定期分类 + 完成度 + 漏项 + 待确认,主动对齐。
- 做**看得见的实在更新**,不堆纯文字、不糊弄、不擅自开被搁置的大坑。
- 节奏放缓时:每轮至多 1 件、低风险;没真问题就只报"巡查结论+无需改动"。

## 1. 安全验证铁律(共用 Supabase,别污染星晨真实数据)
- 一切验证走 **demo**(`?demo=1`,独立 localStorage `xingchen_demo_db`,绝不写云端)或静态 replica。
- 真实数据界面(家长端)**只读截图**,绝不点写操作(打卡/开箱/扣分/确认/收利息/触发衰减)。
- 改 demo 数据:**同一段 eval 里写完立刻 `location.reload()`**(防旧页 watch 覆盖),或清 key 后 navigate。
- v-show 隐藏元素仍在 DOM:点可见项要筛 `offsetParent!==null`。

## 2. 部署仪式(本项目 = gh-pages,非 Actions)
```
npm run build  →  git push origin main  →  bash deploy.sh  →  curl 轮询线上 index-*.js == dist/index.html 的 chunk
```
- ⚠️ 环境到 GitHub 偶发 SSL 中断:push/deploy 都要**写循环重试**直到出现 `PUSH OK`/`gh-pages`。
- 必须 curl 轮询确认"线上 chunk == 本地"才算真上线(别只看 deploy 退出码,deploy.sh 偶尔退 1 但其实成功)。

## 3. 数据迁移(不破坏星晨真实存档)
- **绝不动 `SEED_VERSION`**(动它 → 线上真实数据被当版本不符、用空种子覆盖,进度全丢)。
- 线上加字段/任务:靠 `ensureTasks()` / `ensurePet()` 自动补 + 读取处 `||0`/`==null` 兜底。
- demo 要刷新种子:用独立的 `DEMO_SEED_VERSION`(不参与云端门控)。

## 4. 资源优化(治"加载慢"的标准套路)
- **先实测找真因**(`du`/`ls -lS`),别猜。星晨这次:视频 17M 才是大头,不是图片格式。
- 图片 → **WebP**:`Pillow im.save(out,'WEBP',quality=88,method=6)`(带透明 RGBA;大背景 jpg 限宽 1024 + q82)。约 7x 小。
- 视频 → **ffmpeg**:`-vf scale='min(480,iw)':-2,fps=24 -c:v libx264 -crf 30 -preset slow -an -movflags +faststart`。约 3x 小,480p 手机够清晰。
- 转完**抓帧 Read / 探 metadata** 验证画质;原文件备份;import 改扩展名后删旧图;`loading="lazy" decoding="async"`。

## 5. 抓真 bug 的方法
- **数据实测不靠猜**:时区 bug 用 `localDay()` 实测对齐;加载慢用 `du` 量出真因。
- **口径一致性巡查**:同一概念多处判定要统一(如"英语主线=三项任一"要在连签/家长端/孩子端口径一致)。
- 改前对着代码核实(bug-hunter 会自信误报);demo 必截图验证不白屏不破图(踩过 TDZ 变量定义顺序白屏坑)。

## 6. 设计语言(南哥审美:坚持游戏化 + 金色高级感 + 微动效)
- 复用类(`src/style.css`):`.fx-aurum` 星愿金卡、`.fx-ember` 火苗卡、`.fx-breath` 呼吸光圈、`.fx-flamebob` 火苗跳动。详见 DESIGN_SYSTEM.md。
- 他喜欢:可视化代替文字、连续性火花反馈、金色光晕渐变、呼吸/脉冲/粒子微动效、日历/打卡可视化、排版对齐精致。
- 他讨厌:纯文字单调、鸡毛蒜皮、看不见的改动、糊弄。

## 7. 美术生产(即梦,待南哥"开始做美术"才启动,省 credits)
- `dreamina text2image/image2image`(model 4.0,ratio 1:1,2k);rembg 抠透明(浅色元素会被抠 → 用彩色元素);抓帧 Read 验收,雷同/差就重生成(尽量 1-2 版省 credits)。
- 命名入库 `src/assets/pet/pet_<key>.webp`;petConfig/petImages 注册;demo 调级展示。

## 8. 绿幕色键抠图(白色主体立绘的正解,治"抠图畸形/白雾/白框")
- **痛点**:白狗 + 纯白背景,flood-fill/rembg 必翻车——吃浅色毛、留白雾、被 AI 自带画框挡住。
- **正解**:生成时 prompt 要"纯绿色背景 solid chroma key green screen background + 无边框无相框 + 主体居中四周留白";然后色键抠:`g > r+18 && g > b+18 && g > 80` → 透明,残留绿边去溢色(`g > (r+b)/2+12` → 压绿)。
- 抠完 trim→加 22% 留白→正方形居中→512px WebP;边缘残留检测(最外圈 10px alpha>30 计数应=0)。
- 翅膀/披风大的形态:prompt 强调"主体画小一点、配饰完整收在画面内绝不超出边缘"。

## 9. 动画融合(治"宠物浮贴在场景上")
- **痛点**:抠好的宠物贴进房间再 image2video,像贴纸悬空,无接触感。
- **正解**:合成时 `tw=W*0.60、底部 H*0.95-th`(身体压进窝垫),prompt 写"舒服地坐在柔软的窝垫里身体微微陷进坐垫 + 温暖室内灯光自然照在身上"。
- **防转身**(image2video 高发翻车):prompt 加"正脸朝向镜头大眼睛看观众 + 朝向角度保持不变绝不转身";still 翻车就升级为"一只手从画面上方伸进来轻轻摸狗头顶"或"特写镜头…全程面部可见"。每段必抓帧验收(n=18/n=30),背对镜头=不合格重做。
- 生成链接**当场下载**(URL 几小时就过期)。

## 10. 夜间自主优化巡查清单(每轮挑1处,小步上线)
- 交互:弹窗 scrollLock(计数式 src/lib/scrollLock.js)、:active 按压、toast 叠放队列(连发不顶掉)、输入框 :focus 高亮、视频预热 fetch 秒播。
- 视觉:深色产品图加柔光底、未解锁项用神秘剪影(brightness(0)+紫晕)、✨会动标识数据源=living.js hasLivingSkin(别用旧清单)。
- 巡查工具:playwright 375×760 截图逐页看(全页截图的图片空白多为懒加载时序假象,滚动到位再验);demo 路由守卫强制孩子端,家长端用本地 dev 临时放行(绝不 commit,git checkout 还原)。
