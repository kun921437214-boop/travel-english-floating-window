#!/bin/zsh
cd "$(dirname "$0")"
clear
echo "正在启动：澳新旅行英语悬浮卡片"
echo
npm run app
echo
echo "窗口已关闭。可以直接关闭这个终端窗口。"
read -k 1 "?按任意键退出..."
