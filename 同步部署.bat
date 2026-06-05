@echo off
chcp 65001 >nul
title ning的博客同步工具

echo ========================================
echo    ning的博客同步工具
echo ========================================
echo.

cd /d D:\blog\blog_wbsite

echo [1/3] 同步 Obsidian 笔记...
node sync.js
if errorlevel 1 (
    echo ❌ 同步失败！
    pause
    exit /b 1
)

echo.
echo [2/3] 提交更改...
git add -A
git commit -m "sync: 更新笔记 %date% %time:~0,5%"

echo.
echo [3/3] 推送到 GitHub...
git push origin main
if errorlevel 1 (
    echo ❌ 推送失败！尝试强制推送...
    git push origin main --force
    if errorlevel 1 (
        echo ❌ 推送失败！请检查网络连接或重新配置 Git 认证
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo    ✅ 同步完成！
echo    访问: https://123456334.github.io
echo ========================================
echo.

:: 自动打开浏览器
start https://123456334.github.io

pause
