#!/bin/bash
# 清理 Tad 项目编译产物
# 用法: ./tools/clean.sh

set -e

echo "=== 清理 Tad 项目编译产物 ==="

# 清理各包的 dist 目录
for pkg in packages/*/; do
    if [ -d "$pkg/dist" ]; then
        echo "清理: $pkg/dist"
        rm -rf "$pkg/dist"
    fi
done

# 清理 tad-app 特有目录
echo "清理: packages/tad-app/buildRes"
rm -rf packages/tad-app/buildRes

echo "清理: packages/tad-app/dist (Windows 构建)"
rm -rf packages/tad-app/dist

# 清理 .cache
echo "清理: .cache 目录"
find . -name ".cache" -type d -exec rm -rf {} + 2>/dev/null || true

# 清理源码映射文件（可选）
echo "清理: *.map 文件"
find packages -name "*.map" -type f -delete 2>/dev/null || true

echo ""
echo "=== 清理完成 ==="
echo "注意: node_modules 未清理（重新安装耗时较长）"
echo "如需清理 node_modules，请手动执行: rm -rf node_modules packages/*/node_modules"
