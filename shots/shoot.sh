#!/bin/sh
# usage: shots/shoot.sh <name> <w> <h> <hash>
P="C:/Users/cigvi/AppData/Local/Temp/claude/13ad9dc23f99c07b/24fc5a28-517d-4206-af59-3eb24f171320/scratchpad/chrome-prof"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --user-data-dir="$P" --window-size=$2,$(($3+87)) --virtual-time-budget=${5:-5000} --screenshot="D:/CLAUDE/Akshini/shots/$1.png" "http://localhost:5178/$4" 2>/dev/null
