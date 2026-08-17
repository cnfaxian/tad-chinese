#!/bin/bash
# Tad Linux 一键构建脚本
# 用法: ./tools/build-linux.sh

set -e

echo "=== Tad Linux 构建脚本 ==="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 node，请先安装 Node.js >= 18"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误: Node.js 版本过低 ($(node -v))，需要 >= 18"
    exit 1
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"
echo ""

# 步骤 1: 安装根依赖
echo ">>> 步骤 1/5: 安装根目录依赖..."
npm install

# 步骤 2: Bootstrap
echo ""
echo ">>> 步骤 2/5: Lerna bootstrap..."
npm run bootstrap

# 步骤 3: 构建所有包
echo ""
echo ">>> 步骤 3/5: 构建所有包..."
./tools/build-all.sh

# 步骤 4: 构建 tad-app
echo ""
echo ">>> 步骤 4/5: 构建 tad-app..."
cd packages/tad-app
npm run build-prod

# 步骤 5: 打包
echo ""
echo ">>> 步骤 5/5: 打包 Linux 版本..."
npm run dist

echo ""
echo "=== 构建完成 ==="
echo "产物位置: packages/tad-app/dist/"
ls -lh packages/tad-app/dist/*.AppImage 2>/dev/null || echo "  (未找到 AppImage 文件)"
echo ""
echo "使用方法:"
echo "  chmod +x packages/tad-app/dist/Tad-*.AppImage"
echo "  ./packages/tad-app/dist/Tad-*.AppImage"
