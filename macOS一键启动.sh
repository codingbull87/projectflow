#!/bin/bash

# ==========================================
# Project Flow - macOS 一键启动脚本
# ==========================================

echo "======================================"
echo "  Project Flow - macOS 启动脚本"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查 Node.js 是否安装
echo -e "${YELLOW}[1/4] 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未检测到 Node.js!${NC}"
    echo ""
    echo "请先安装 Node.js (推荐 v18 或更高版本):"
    echo "  方式1: 访问 https://nodejs.org/zh-cn/"
    echo "  方式2: 使用 Homebrew: brew install node"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js 已安装: $NODE_VERSION${NC}"
echo ""

# 2. 配置中国大陆镜像源
echo -e "${YELLOW}[2/4] 配置 npm 镜像源 (淘宝镜像)...${NC}"
npm config set registry https://registry.npmmirror.com
echo -e "${GREEN}✓ 镜像源已设置为: $(npm config get registry)${NC}"
echo ""

# 3. 检查并安装依赖
echo -e "${YELLOW}[3/4] 检查项目依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "首次运行,正在安装依赖包..."
    echo "这可能需要几分钟,请耐心等待..."
    echo ""
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 依赖安装成功!${NC}"
    else
        echo -e "${RED}❌ 依赖安装失败,请检查网络连接${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ 依赖已存在${NC}"
fi
echo ""

# 4. 启动开发服务器
echo -e "${YELLOW}[4/4] 启动开发服务器...${NC}"
echo ""
echo "======================================"
echo -e "${GREEN}🚀 Project Flow 正在启动...${NC}"
echo "======================================"
echo ""
echo "提示:"
echo "  - 服务器启动后会自动打开浏览器"
echo "  - 默认地址: http://localhost:3000"
echo "  - 按 Ctrl+C 可停止服务器"
echo ""
echo "======================================"
echo ""

# 启动服务器
npm run dev

# 如果服务器被停止
echo ""
echo -e "${YELLOW}服务器已停止${NC}"
