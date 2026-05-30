# 🌟 星晨成长日记

给王星晨(12 岁)做的家庭习惯养成 Web App。英语主线打卡 + 宠物养成(星愿犬) + 周/累积签到 + 时间银行 + 诚信分 + 家庭事后核验。

## 技术栈
Vue 3 + Vite + Tailwind CSS。Hash 路由,适配 GitHub Pages。

## 角色
- **星晨端**:今日任务自主打卡、宠物成长、签到、时间银行、奖励兑换、日历。
- **家庭端**(爸爸/妈妈/外婆/外公):事后核验(确认/虚报/争议/撤销)、流水日志、兑换处理。
- **管理端**(爸爸,密码 `xiaoyu2026`):任务/时间银行/利息配置。

## 数据层
第一版用浏览器 localStorage,结构对齐 `DATA_MODEL.md`。`src/services/*` 封装业务逻辑,
未来切 Supabase 时只需替换数据读写,业务逻辑不动。

## 开发
```bash
npm install
npm run dev
npm run build
```
push 到 `main` → GitHub Actions 自动部署到 Pages。
