@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ==========================================
REM Project Flow - Windows 一键启动脚本
REM ==========================================

echo ======================================
echo   Project Flow - Windows 启动脚本
echo ======================================
echo.

REM 1. 检查 Node.js 是否安装
echo [1/4] 检查 Node.js 环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js!
    echo.
    echo 请先安装 Node.js ^(推荐 v18 或更高版本^):
    echo   访问: https://nodejs.org/zh-cn/
    echo   下载并安装 Windows 版本
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js 已安装: %NODE_VERSION%
echo.

REM 2. 配置中国大陆镜像源
echo [2/4] 配置 npm 镜像源 ^(淘宝镜像^)...
call npm config set registry https://registry.npmmirror.com
for /f "tokens=*" %%i in ('npm config get registry') do set REGISTRY=%%i
echo ✓ 镜像源已设置为: %REGISTRY%
echo.

REM 3. 检查并安装依赖
echo [3/4] 检查项目依赖...
if not exist "node_modules\" (
    echo 首次运行,正在安装依赖包...
    echo 这可能需要几分钟,请耐心等待...
    echo.
    call npm install
    if !errorlevel! equ 0 (
        echo ✓ 依赖安装成功!
    ) else (
        echo ❌ 依赖安装失败,请检查网络连接
        pause
        exit /b 1
    )
) else (
    echo ✓ 依赖已存在
)
echo.

REM 4. 启动开发服务器
echo [4/4] 启动开发服务器...
echo.
echo ======================================
echo 🚀 Project Flow 正在启动...
echo ======================================
echo.
echo 提示:
echo   - 服务器启动后会自动打开浏览器
echo   - 默认地址: http://localhost:3000
echo   - 按 Ctrl+C 可停止服务器
echo.
echo ======================================
echo.

REM 启动服务器
call npm run dev

REM 如果服务器被停止
echo.
echo 服务器已停止
pause
