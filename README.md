# Tad - 中文汉化版

本项目是 [Tad](https://www.tadviewer.com) 的中文汉化版本，基于 [antonycourtney/tad](https://github.com/antonycourtney/tad) 分支而来。

Tad 是一款用于查看和分析表格数据的桌面应用程序，支持 CSV、Parquet、SQLite、DuckDb 等多种数据格式。内部使用 [DuckDb](https://duckdb.org/) 内存数据库引擎进行高性能分析查询。

## 主要功能

- 支持 CSV、Parquet、SQLite、DuckDb、csv.gz 等数据格式
- 基于 [SlickGrid](http://slickgrid.net/) 的高效数据网格，支持百万级行数据的流畅滚动
- 层次化透视表功能，支持透视、筛选、聚合、排序、列选择、列排序和基础列格式化
- 通过 SQL 生成引擎自动执行所有分析操作

## 本次更新

### 中文汉化

全部用户界面已翻译为中文，包括：

- 菜单栏（文件、编辑、视图、帮助）
- 所有对话框（打开文件、导出、更新提示等）
- 透视表侧边栏（透视列、筛选器、聚合、排序）
- 底部状态栏（数据源、行数、文件大小、计算状态）
- 格式化面板（数字格式、文本格式、显示顺序）
- 帮助文档（快速入门指南）
- 文件关联名称（CSV 文件、Parquet 文件等）

### 单元格选中高亮

新增单元格选中时的行+列浅蓝色高亮功能：

- 选中单元格时，所在行显示浅蓝色背景
- 选中单元格时，所在列显示更浅的蓝色背景
- 列标题同步高亮显示
- 便于在大数据集中快速定位当前选中位置

### 日期时间时区修复

修复了日期/时间列的时区显示问题：

- **修复前**：所有时间戳统一使用 `toISOString()` 输出 UTC 时间（带 `Z` 后缀），导致带时区的时间显示不正确。例如存储 `03:15:00+08:00` 会显示为 `19:15:00.000Z`
- **修复后**：
  - `TIMESTAMP`（无时区）：显示本地时间，如 `03:15:00`
  - `TIMESTAMPTZ` / `TIMESTAMP WITH TIME ZONE`：显示本地时间 + 时区偏移，如 `03:15:00+08:00`
  - `DATE`：仅显示日期部分（不变）
- 修改文件：`packages/reltab/src/dialects/DuckDBDialect.ts`

## 下载使用

前往 [Releases](https://github.com/cnfaxian/tad-chinese/releases) 页面下载最新版本。

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `Tad 0.14.0.exe` | 便携版，双击即用 |
| Linux | `tad-0.14.0.tar.gz` | 解压后运行可执行文件 |
| macOS | 需在 Mac 上构建 | `npx electron-builder --mac zip` |

## 从源码构建

详细构建说明请参考 [doc/building.md](doc/building.md)

## 项目来源

本项目基于 [antonycourtney/tad](https://github.com/antonycourtney/tad) 分支而来，主要改动：

- 全部用户界面翻译为中文
- 新增单元格选中行/列高亮功能
- 修复日期时间列的时区显示问题
- 提供 Windows/Linux 便携版打包

### 核心包说明

| 包名 | 说明 |
|------|------|
| [reltab](./packages/reltab) | 关系式 SQL 查询构建与执行的核心抽象层 |
| [reltab-duckdb](./packages/reltab-duckdb/) | DuckDb 数据库驱动 |
| [reltab-sqlite](./packages/reltab-sqlite/) | SQLite 数据库驱动 |
| [aggtree](./packages/aggtree/) | 基于 reltab 的透视树构建库 |
| [tadviewer](./packages/tadviewer/) | Tad 透视表 UI 组件 |
| [tad-app](./packages/tad-app/) | 基于 Electron 的桌面应用 |

### 实验性包

| 包名 | 说明 |
|------|------|
| [tadweb-app](./packages/tadweb-app/) | 基于 tadviewer 的 Web 应用示例 |
| [tadweb-server](./packages/tadweb-server/) | Tad Web 应用参考服务器 |
| [reltab-aws-athena](./packages/reltab-aws-athena/) | AWS Athena 数据库驱动 |
| [reltab-bigquery](./packages/reltab-bigquery/) | Google BigQuery 数据库驱动 |
| [reltab-snowflake](./packages/reltab-snowflake/) | Snowflake 数据库驱动 |

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)
