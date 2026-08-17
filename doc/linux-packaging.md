# Linux 打包说明

## 前置条件

- Node.js >= 18（推荐 19+）
- npm >= 9
- Git
- build-essential（Ubuntu/Debian）

## 环境准备

```bash
# Ubuntu/Debian 安装构建工具
sudo apt update
sudo apt install -y build-essential git

# 安装 Node.js（推荐 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
source ~/.bashrc
nvm install 19
nvm use 19
```

## 构建步骤

### 1. 克隆仓库

```bash
git clone https://github.com/cnfaxian/tad-chinese.git
cd tad-chinese
```

### 2. 安装依赖

```bash
npm install
npm run bootstrap
```

### 3. 构建所有包

按依赖顺序构建：reltab → aggtree → tadviewer → tad-app

```bash
# 方式 A：使用已有脚本
./tools/build-all.sh

# 方式 B：手动逐个构建
cd packages/reltab && npm run build && cd ../..
cd packages/aggtree && npm run build && cd ../..
cd packages/reltab-duckdb && npm run build && cd ../..
cd packages/tadviewer && npm run build && cd ../..
```

### 4. 构建 tad-app

```bash
cd packages/tad-app
npm run build-prod
```

### 5. 打包

```bash
npm run dist
```

## 构建产物

产物在 `packages/tad-app/dist/` 目录：

| 文件 | 说明 |
|------|------|
| `Tad-0.14.0.AppImage` | 通用绿色版，所有 Linux 发行版可运行 |
| `linux-unpacked/` | 解压后的应用目录 |

## AppImage 使用方法

```bash
# 添加执行权限
chmod +x Tad-0.14.0.AppImage

# 直接运行
./Tad-0.14.0.AppImage
```

## 减小包体积

默认打包约 150-200MB。可选优化：

1. **删除不需要的实验性后端**（可节省约 30MB）：
   ```bash
   rm -rf packages/reltab-aws-athena
   rm -rf packages/reltab-bigquery
   rm -rf packages/reltab-snowflake
   rm -rf packages/tadweb-app
   rm -rf packages/tadweb-server
   ```

2. **启用 asar 压缩**：编辑 `packages/tad-app/package.json`，将 `"asar": false` 改为 `"asar": true`

## 注意事项

- electron-builder **不支持交叉编译**，必须在 Linux 系统上构建
- `tools/notarize.js` 仅在 macOS 上生效，Linux 构建会自动跳过
- `tools/afterPack.js` 仅打印日志，不影响 Linux 构建
- 构建日志位于 `~/.config/Tad/main.log`

## 文件关联

打包后的 AppImage 支持以下文件类型双击打开：

- `.csv` / `.tsv` - 分隔值文件
- `.parquet` - Parquet 文件
- `.sqlite` - SQLite 文件
- `.duckdb` - DuckDb 文件
- `.csv.gz` - 压缩 CSV 文件
- `.tad` - Tad 保存的工作区
