# 澳新旅行英语悬浮卡片

一个 Mac 桌面悬浮窗英语学习工具，用 Electron + React + Vite 构建。它可以从 `澳新旅行英语_340句_915词.xlsx` 转换数据，在小窗口里翻看澳大利亚、新西兰旅行英语句子和单词，支持朗读、筛选、搜索、隐藏中文、学习状态保存和窗口置顶。

## 环境要求

- macOS
- Node.js 18 或更高版本
- npm

## 最简单的运行方式

### 方式一：双击启动

在 Finder 中打开项目文件夹，双击：

```text
启动.command
```

它会自动做三件事：

1. 如果还没安装依赖，自动运行 `npm install`；
2. 自动运行 `npm run convert:data`；
3. 自动启动悬浮窗。

第一次运行需要联网安装依赖，可能会慢一些。

### 方式二：一条命令启动

```bash
cd travel-english-floating-window
npm start
```

`npm start` 和双击启动一样，会自动检查依赖、转换数据并启动 App。

## 手动安装依赖

如果你想分步骤执行，也可以运行：

```bash
npm install
npm run convert:data
npm run dev
```

## Excel 文件放在哪里

请把 Excel 文件放到：

```text
data/澳新旅行英语_340句_915词.xlsx
```

如果暂时没有这个文件，应用仍然可以启动，界面会提示：

```text
请把 Excel 文件放到 data 文件夹中，然后运行 npm run convert:data
```

## 转换 Excel 数据

```bash
npm run convert:data
```

脚本会读取 `data/澳新旅行英语_340句_915词.xlsx`，自动解析所有工作表，并输出到：

```text
src/data/travel-english.json
```

脚本会尽量兼容不同表头，包括场景、分类、英文、句子、单词、中文意思、优先级、使用提示和学习状态等列名。

## 启动开发模式

```bash
npm run dev
```

开发模式会启动 Vite 和 Electron，默认打开一个 420 x 300 的悬浮窗口，显示在屏幕右上角，并默认置顶。

如果你不想手动安装依赖和转换数据，推荐使用：

```bash
npm start
```

## 打包成 Mac App

```bash
npm run dist:mac
```

打包产物会生成在 `release` 或 electron-builder 默认输出目录中，具体路径会在终端输出。

## 常用功能

- 右方向键：下一条
- 左方向键：上一条
- 空格键：朗读当前英文
- H：隐藏/显示中文
- M：切换迷你模式
- R：随机下一条
- S：停止朗读
- 1：标记为未学
- 2：标记为学习中
- 3：标记为已掌握

搜索框聚焦时，快捷键不会干扰输入。

## 常见问题

### 朗读没有声音怎么办

本项目使用系统内置 `speechSynthesis`，不会联网调用第三方 TTS。请检查：

1. Mac 系统音量是否打开；
2. 系统是否安装英文语音；
3. 是否被其他音频设备占用；
4. 点击“停止朗读”后重新点击“朗读”。

应用会优先选择 `en-NZ`、`en-AU`、`en-GB`、`en-US` 语音。如果找不到英文语音，会退回系统默认语音。

### 数据为空怎么办

请确认：

1. Excel 文件名是否为 `澳新旅行英语_340句_915词.xlsx`；
2. 文件是否放在 `data` 文件夹；
3. 是否运行了 `npm run convert:data`；
4. Excel 里是否有英文、中文、场景等有效列。

如果表头不完全匹配，转换脚本会做容错；仍然为空时，可以先检查 Excel 首行是否是表头。

### Mac 提示无法打开 App 怎么办

如果是本地未签名 App，macOS 可能会阻止打开。可以尝试：

1. 打开“系统设置”；
2. 进入“隐私与安全性”；
3. 在安全提示区域选择“仍要打开”；
4. 或右键 App，选择“打开”。

正式分发时建议配置 Apple Developer 签名和公证。

## 可用命令

```bash
npm start
npm run app
npm run setup
npm run dev
npm run convert:data
npm run build
npm run dist:mac
npm run lint
```

- `npm start` / `npm run app`：推荐入口，自动安装依赖、转换数据、启动 App。
- `npm run setup`：只安装依赖并转换数据，不启动 App。
- `npm run dev`：只启动开发环境，适合已经安装依赖之后使用。

## 数据保存

学习状态、隐藏中文、迷你模式、筛选条件、语速和置顶状态会保存在 `localStorage`。关闭 App 后再次打开会自动恢复。
