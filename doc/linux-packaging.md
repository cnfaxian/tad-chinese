# Linux 打包说明

## 前置条件

- Node.js >= 18（推荐 19+）
- npm >= 9
- Git

## 环境准备

```bash
# 安装依赖工具（Ubuntu/Debian）
sudo apt update
sudo apt install -y build-essential git

# 安装 Node.js（推荐用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
source ~/.bashrc
nvm install 19
nvm use 19
```

## 构建步骤

```bash
# 1. 克隆仓库
git clone https://github.com/cnfaxian/tad-chinese.git
cd tad-chinese

# 2. 安装根目录依赖
npm install

# 3. 启动 lerna bootstrap（链接内部包 + 安装子包依赖）
npm run bootstrap

# 4. 构建所有包（reltab → aggtree → tadviewer → tad-app）
./tools/build-all.sh

# 5. 打包 Linux 版本
cd packages/tad-app
npm run dist
```

## 构建产物

打包完成后，产物在 `packages/tad-app/dist/` 目录：

| 文件 | 说明 |
|------|------|
| `Tad-0.14.0.AppImage` | 通用绿色版，所有 Linux 发行版可运行 |
| `linux-unpacked/` | 解压后的应用目录（可直接运行） |

## AppImage 使用方法

AppImage 是免安装的通用 Linux 可执行格式：

```bash
# 添加执行权限
chmod +x Tad-0.14.0.AppImage

# 直接运行
./Tad-0.14.0.AppImage

# 可选：集成到系统（创建桌面快捷方式）
./Tad-0.14.0.AppImage --appimage-extract-and-run
```

## 减小包体积

默认打包约 150-200MB。如需减小体积：

### 方法 1：排除不需要的依赖

编辑 `packages/tad-app/package.json`，在 `build.files` 中精简：

```json
"files": [
  "dist/index.html",
  "dist/main.bundle.js",
  "dist/preload.js",
  "dist/tadapp.bundle.js",
  "dist/tadapp.bundle.js.LICENSE.txt",
  "dist/userdocs/**/*"
]
```

### 方法 2：使用 asar 压缩

默认 `asar: false`（便于调试）。生产打包可改为：

```json
"asar": true
```

### 方法 3：排除可选后端

如不需要 AWS/BigQuery/Snowflake 等实验性后端，在构建前删除：

```bash
rm -rf packages/reltab-aws-athena
rm -rf packages/reltab-bigquery
rm -rf packages/reltab-snowflake
rm -rf packages/tadweb-app
rm -rf packages/tadweb-server
```

## 常见问题

### DuckDB 原生模块加载失败

确保安装了 `build-essential`：
```bash
sudo apt install build-essential
```

### electron-builder 报错

检查 Node.js 版本，推荐 19+：
```bash
node --version  # 应 >= 18
```

### AppImage 无法运行

检查 FUSE 是否安装：
```bash
sudo apt install fuse libfuse2
```

## 文件关联

打包后的 AppImage 支持以下文件类型双击打开：

- `.csv` - 逗号分隔值
- `.tsv` - 制表符分隔值
- `.parquet` - Parquet 文件
- `.sqlite` - SQLite 文件
- `.duckdb` - DuckDb 文件
- `.csv.gz` - 压缩 CSV 文件
- `.tad` - Tad 保存的工作区
