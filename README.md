# 哑巴说话 / 澳新旅行英语

一个个人用的澳新旅行英语学习项目，包含：

- Mac 桌面 Electron 悬浮学习卡片。
- 手机网页 / PWA 学习端，支持本地学习和可选 Supabase 云同步。

本仓库用于后续统一项目管理。真实 Excel、完整生成数据、桌面快捷方式和构建产物不提交到 GitHub。

## 技术栈

桌面端：

- Electron
- React
- Vite
- xlsx
- electron-builder

手机网页端：

- React
- Vite
- Supabase JS
- vite-plugin-pwa
- Cloudflare Pages

## 安装依赖

```bash
npm install
```

手机网页端单独安装：

```bash
cd mobile-web
npm install
```

## 数据准备

真实 Excel 文件放在：

```text
data/澳新旅行英语_340句_915词.xlsx
```

然后运行：

```bash
npm run convert:data
```

这会生成本地文件：

```text
src/data/travel-english.json
```

完整数据文件已加入 `.gitignore`，不会上传到 GitHub。仓库里只保留 `sample_data/` 的脱敏样例。

## 启动桌面端

开发模式：

```bash
npm run dev
```

本地一键启动：

```bash
npm start
```

构建前端：

```bash
npm run build
```

打包 Mac App：

```bash
npm run dist:mac
```

修复或更新桌面快捷方式：

```bash
npm run shortcut:desktop
```

## 启动手机网页端

```bash
cd mobile-web
npm run dev
```

构建：

```bash
cd mobile-web
npm run build
```

Cloudflare Pages 部署参考：

- Root directory: `mobile-web`
- Build command: `npm run build`
- Build output directory: `dist`

当前手机网页入口：

- https://travel-english-mobile-web.pages.dev/

## 常用功能

- 上一条 / 下一条 / 随机复习
- 顺序学习 / 随机复习模式
- 朗读 / 停止朗读
- 搜索和筛选
- 隐藏中文
- 学习状态：未学、学习中、已掌握
- 记住上次学习位置
- 桌面窗口置顶、迷你模式、关闭和最小化
- 手机端 PWA 添加到主屏幕

## 快捷键

- 右方向键：下一条
- 左方向键：上一条
- 空格：朗读
- `H`：隐藏 / 显示中文
- `M`：迷你模式
- `R`：随机 / 随机复习
- `S`：停止朗读
- `1`：未学
- `2`：学习中
- `3`：已掌握

搜索框聚焦时不会触发这些快捷键。

## 常见问题

### 没有数据怎么办？

确认 Excel 文件在 `data/` 目录，然后运行：

```bash
npm run convert:data
```

### 朗读没有声音怎么办？

系统语音由浏览器 / macOS 提供。请确认系统有英文语音，且没有静音。移动端通常需要用户点击后才允许播放语音。

### Mac 提示无法打开 App 怎么办？

当前是本地未签名构建。开发阶段可以用 `npm start` 或桌面快捷方式启动；分发给其他人前需要代码签名和公证。

### GitHub 为什么没有完整 Excel？

真实学习数据不适合上传。仓库只提交脱敏样例；完整数据留在本机或外部私有存储。

## 文档

- [项目交接](docs/PROJECT_HANDOFF.md)
- [测试报告](docs/TEST_REPORT.md)
- [数据规则](docs/DATA_RULES.md)
- [部署说明](docs/DEPLOYMENT.md)
- [路线图](ROADMAP.md)
- [变更记录](CHANGELOG.md)
