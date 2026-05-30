# AGENTS.md

## 项目目标

这是一个 Mac 桌面悬浮窗英语学习工具，名字叫“澳新旅行英语悬浮卡片”。目标是读取澳大利亚、新西兰旅行英语 Excel 数据，并在 Electron 小窗口中展示句子和单词，支持翻页、随机、搜索、筛选、朗读、隐藏中文、迷你模式、学习状态和窗口置顶。

## 技术栈

- Electron
- React
- Vite
- xlsx
- electron-builder

## 常用命令

```bash
npm install
npm start
npm run app
npm run setup
npm run convert:data
npm run dev
npm run build
npm run dist:mac
npm run lint
```

## 数据文件说明

- 原始 Excel 文件路径：`data/澳新旅行英语_340句_915词.xlsx`
- 转换后 JSON 路径：`src/data/travel-english.json`
- 如果 Excel 文件不存在，`npm run convert:data` 应该生成空 JSON，并输出提示，不要让项目无法启动。
- 转换脚本需要兼容不同表头，不能因为单个表头不匹配就崩溃。

## 重要限制

- 不要联网调用 TTS。
- 朗读必须使用浏览器或系统内置 `speechSynthesis`。
- 不要删除 `data/澳新旅行英语_340句_915词.xlsx`。
- 不要在渲染进程中直接使用 Node.js API。
- Electron 需要保持 `nodeIntegration: false` 和 `contextIsolation: true`。

## 修改后检查

修改代码后优先运行：

```bash
npm run lint
npm run build
```

如果修改了 Excel 转换逻辑，还要运行：

```bash
npm run convert:data
```
