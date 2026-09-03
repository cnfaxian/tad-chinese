import * as fs from "fs";
import * as log from "loglevel";
import * as path from "path";
import * as fsPromises from "fs/promises";

import {
  ColumnStatsMap,
  DataSourceConnection,
  DataSourceId,
  DataSourceNode,
  DataSourcePath,
  DataSourceProvider,
  DbDataSource,
  DbDriver,
  DuckDBDialect,
  getConnection,
  registerProvider,
  Row,
  Schema,
  SQLDialect,
} from "reltab";
import * as reltabDuckDB from "reltab-duckdb";
import { DuckDBDriver } from "reltab-duckdb";

export const dataFileExtensions = [
  "csv",
  "tsv",
  "csv.gz",
  "tsv.gz",
  "parquet",
  "txt",
  "data",
  "log",
];

interface ImportedFileInfo {
  baseName: string;
  tableName: string | null;
  path: string;
}

let _duckDBDriver: DuckDBDriver | null;
async function getDuckDBDriver(): Promise<DuckDBDriver> {
  if (!_duckDBDriver) {
    let connKey: DataSourceId;

    connKey = {
      providerName: "duckdb",
      resourceId: ":memory:",
    };
    const dsConn = await getConnection(connKey, {
      hidden: true,
      forExport: true,
    });
    const dbds = dsConn as DbDataSource;
    const driver = dbds.db as reltabDuckDB.DuckDBDriver;
    _duckDBDriver = driver;
  }
  return _duckDBDriver;
}

// our own impl of path.extName that uses the first '.'
// (rather than last '.') to allow for extensions
// like '.csv.gz':
function extNameEx(path: string): string {
  const dotIndex = path.indexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  const ext = path.slice(dotIndex);
  return ext;
}

const ipfsPathPrefixes = ["s3://", "https://"];
export const isIPFSPath = (pathname: string): boolean => {
  for (const prefix of ipfsPathPrefixes) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
};

/*
 * 按"内容"而不是"后缀名"识别本地数据文件的真实格式。
 *
 * 结尾返回字符串（而非枚举），以便跨包使用而无需额外依赖：
 *   - "sqlite"  : SQLite 数据库文件（SQLite format 3\0 头），无论后缀 .db/.sqlite/.db3/...
 *   - "duckdb"  : DuckDB 数据库文件（头内包含 DUCK 魔数）
 *   - "parquet" : Parquet 列式文件（PAR1 魔数头/尾）
 *   - "text"    : 其余按分隔文本（CSV/TSV）对待，交给 DuckDB read_csv_auto 识别
 */
export const sniffLocalFileType = async (filePath: string): Promise<string> => {
  const bufSize = 64;
  const buf = Buffer.alloc(bufSize);
  let nread = 0;

  try {
    const fd = await fsPromises.open(filePath, "r");
    try {
      const { bytesRead } = await fd.read(buf, 0, bufSize, 0);
      nread = bytesRead;
    } finally {
      await fd.close();
    }
  } catch (err) {
    // 无法读取（如 IPFS 路径）→ 视为文本
    return "text";
  }

  const head = buf.slice(0, nread);
  const headStr = head.toString("latin1");

  // SQLite: 以 "SQLite format 3" 开头（后跟 NULL 字节）
  if (headStr.startsWith("SQLite format 3")) {
    return "sqlite";
  }
  // DuckDB: 数据库头在前 16 字节内包含 "DUCK" 魔数
  if (headStr.slice(0, 16).includes("DUCK")) {
    return "duckdb";
  }
  // Parquet: 以 PAR1 开头（结尾通常也是 PAR1）
  if (headStr.startsWith("PAR1")) {
    return "parquet";
  }
  return "text";
};

interface ImportInfo {
  tableName: string; // table name used to import this table
  importModTime?: Date; // mod time of the file at time of import, as returned from fs.stat() (iff not an IPFS path)
}

// mapping from pathnames to imported table names:
type ImportMap = { [path: string]: ImportInfo };

export class FSDriver implements DbDriver {
  private dbc: DuckDBDriver;
  private rootPath: string;
  private isDir: boolean;
  private isIPFS: boolean;
  private importMap: ImportMap = {};
  private readonly displayName: string;
  readonly sourceId: DataSourceId;
  readonly dialect: SQLDialect = DuckDBDialect;

  constructor(
    dbc: DuckDBDriver,
    rootPath: string,
    isDir: boolean,
    isIPFS: boolean
  ) {
    this.dbc = dbc;
    this.rootPath = rootPath;
    this.isDir = isDir;
    this.isIPFS = isIPFS;
    this.displayName = rootPath;
    this.sourceId = { providerName: "localfs", resourceId: rootPath };
  }

  async runSqlQuery(query: string): Promise<Row[]> {
    return this.dbc.runSqlQuery(query);
  }

  getTableSchema(tableName: string): Promise<Schema> {
    return this.dbc.getTableSchema(tableName);
  }
  getSqlQuerySchema(sqlQuery: string): Promise<Schema> {
    return this.dbc.getSqlQuerySchema(sqlQuery);
  }

  async getSqlQueryColumnStatsMap(sqlQuery: string): Promise<ColumnStatsMap> {
    return this.dbc.getSqlQueryColumnStatsMap(sqlQuery);
  }

  async getRootNode(): Promise<DataSourceNode> {
    const displayName = path.basename(this.rootPath);
    const rootNode: DataSourceNode = {
      id: ".",
      kind: this.isDir ? "Directory" : "File",
      displayName,
      isContainer: this.isDir,
    };
    return rootNode;
  }
  getTargetPath(dsPath: DataSourcePath): string {
    return this.isIPFS
      ? this.rootPath
      : path.join(this.rootPath, ...dsPath.path);
  }
  async getChildren(dsPath: DataSourcePath): Promise<DataSourceNode[]> {
    const targetPath = this.getTargetPath(dsPath);
    const dirEnts = await fs.promises.readdir(targetPath, {
      withFileTypes: true,
    });
    const dataEnts = dirEnts.filter((ent) => {
      const isDir = ent.isDirectory();
      if (isDir) {
        return true;
      }
      const extName = extNameEx(ent.name);
      if (extName !== "") {
        const ext = extName.slice(1);
        const index = dataFileExtensions.findIndex((dext) => dext === ext);
        return index !== -1;
      }
      return false;
    });
    const childNodes = dataEnts.map((ent) => {
      const isDir = ent.isDirectory();
      const node: DataSourceNode = {
        id: ent.name,
        kind: isDir ? "Directory" : "File",
        displayName: ent.name,
        isContainer: isDir,
      };
      return node;
    });
    return childNodes;
  }

  // Get a table name that can be used in queries:
  async getTableName(dsPath: DataSourcePath): Promise<string> {
    const targetPath = this.getTargetPath(dsPath);
    let importInfo = this.importMap[targetPath];
    if (!importInfo) {
      log.debug(
        "getTableName: no entry found for ",
        targetPath,
        ", importing..."
      );
      let tableName: string;
      const fileType = await sniffLocalFileType(targetPath);
      if (fileType === "parquet") {
        tableName = await reltabDuckDB.nativeParquetImport(
          this.dbc.db,
          targetPath
        );
      } else {
        tableName = await reltabDuckDB.nativeCSVImport(this.dbc.db, targetPath);
      }
      if (isIPFSPath(targetPath)) {
        importInfo = {
          tableName,
        };
      } else {
        const fileStats = await fsPromises.stat(targetPath);
        importInfo = {
          tableName,
          importModTime: fileStats.mtime,
        };
      }
      this.importMap[targetPath] = importInfo;
    } else {
      log.debug(" getTableName: ", targetPath, " ---> ", importInfo.tableName);
      if (importInfo.importModTime !== undefined) {
        const fileStats = await fsPromises.stat(targetPath);
        if (fileStats.mtime > importInfo.importModTime) {
          log.debug(
            "**** detected updated file, re-importing: ",
            targetPath,
            fileStats.mtime
          );
          const tableName = importInfo.tableName;
          const fileType = await sniffLocalFileType(targetPath);
          if (fileType === "parquet") {
            await reltabDuckDB.nativeParquetImport(
              this.dbc.db,
              targetPath,
              tableName
            );
          } else {
            await reltabDuckDB.nativeCSVImport(
              this.dbc.db,
              targetPath,
              tableName
            );
          }
          importInfo.importModTime = fileStats.mtime;
        }
      }
    }
    return importInfo.tableName;
  }

  // display name for this connection
  async getDisplayName(): Promise<string> {
    return this.displayName;
  }
}

async function connectFileSource(
  pathname: string
): Promise<DataSourceConnection> {
  if (isIPFSPath(pathname)) {
    const dbc = await getDuckDBDriver();
    const driver = new FSDriver(dbc, pathname, false, true);
    const dsConn = new DbDataSource(driver);
    return dsConn;
  }
  // local file:
  // check if pathname exists
  if (!fs.existsSync(pathname)) {
    let msg = '"' + pathname + '": file not found.';
    throw new Error(msg);
  }
  const fstats = await fs.promises.stat(pathname);
  const isDir = fstats.isDirectory();

  const dbc = await getDuckDBDriver();
  const driver = new FSDriver(dbc, pathname, isDir, false);
  const dsConn = new DbDataSource(driver);
  return dsConn;
}

const localfsDataSourceProvider: DataSourceProvider = {
  providerName: "localfs",
  connect: async (resourceId: any): Promise<DataSourceConnection> => {
    return connectFileSource(resourceId);
  },
};

registerProvider(localfsDataSourceProvider);
