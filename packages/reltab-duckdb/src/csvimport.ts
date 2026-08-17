/**
 * Import CSV files into DuckDb
 */

import * as log from "loglevel";
import * as path from "path";
import { Connection, Database } from "duckdb-async";
import * as prettyHRTime from "pretty-hrtime";
import { initS3 } from "./s3utils";
let uniqMap: { [cid: string]: number } = {};

/* add a numeric _N suffix to an identifer to make it unique */
const uniquify = (src: string): string => {
  let entry = uniqMap[src];
  if (entry === undefined) {
    uniqMap[src] = 1;
    return src; // no suffix needed
  }
  const ret = src + "_" + entry.toString();
  uniqMap[src] = ++entry;
  return ret;
};

/* map to alphanumeric */
const mapIdent = (src: string): string => {
  const ret = src.replace(/[^a-z0-9_]/gi, "_");
  return ret;
};

const isAlpha = (ch: string): boolean => /^[A-Z]$/i.test(ch);

const MAXLEN = 16;

/* generate a SQL table name from pathname */
const genTableName = (pathname: string): string => {
  const extName = path.extname(pathname);
  const baseName = path.basename(pathname, extName);
  let baseIdent = mapIdent(baseName);
  if (baseIdent.length >= MAXLEN) {
    baseIdent = baseIdent.slice(0, MAXLEN);
  }
  if (!isAlpha(baseIdent[0])) {
    baseIdent = "t_" + baseIdent;
  }
  const tableName = uniquify(baseIdent);
  return tableName;
};

/**
 * 时间相关列类型：这些列在 CSV 导入时保持原始文本（VARCHAR），
 * 以避免 DuckDB 类型化时丢失原始时区偏移（如 +08:00）。
 */
const TIME_COLUMN_TYPES = [
  "DATE",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "DATETIME",
];

const isTimeColumnType = (colType: string): boolean => {
  const upper = colType.toUpperCase();
  return TIME_COLUMN_TYPES.some(
    (t) => upper === t || upper.startsWith(t + " ")
  );
};

/**
 * 构造时间列保持文本的导入查询：
 * 1. 先用 read_csv_auto(all_varchar=1) 全文本读取（保留原始偏移文本）
 * 2. 非时间列 cast 回 DuckDB 推断的原始类型（数值/布尔无损还原）
 * 3. 时间列保持 VARCHAR 原样入库
 */
const buildTextPreservingQuery = (
  tableName: string,
  filePath: string,
  descRows: any[]
): string => {
  const colExprs = descRows.map((r) => {
    const colName = r.column_name as string;
    const colType = String(r.column_type).toUpperCase();
    if (isTimeColumnType(colType) || colType === "VARCHAR") {
      return `"${colName}"`;
    }
    return `CAST("${colName}" AS ${colType}) AS "${colName}"`;
  });
  const allVarcharQuery = `SELECT * FROM read_csv_auto('${filePath}', all_varchar=1)`;
  return `CREATE OR REPLACE TABLE ${tableName} AS SELECT ${colExprs.join(
    ", "
  )} FROM (${allVarcharQuery})`;
};

/**
 * Native import using DuckDB's built-in import facilities.
 */
export const nativeCSVImport = async (
  db: Database,
  filePath: string,
  tableName?: string
): Promise<string> => {
  const importStart = process.hrtime();

  const dbConn = await db.connect();
  await initS3(dbConn);
  if (!tableName) {
    tableName = genTableName(filePath);
  }

  // 探测 CSV 列类型推断结果，识别时间列：
  let descRows: any[];
  try {
    const describeQuery = `DESCRIBE SELECT * FROM read_csv_auto('${filePath}')`;
    descRows = await dbConn.all(describeQuery);
  } catch (err) {
    descRows = [];
  }
  const hasTimeCols = descRows.some((r) =>
    isTimeColumnType(String(r.column_type))
  );

  let query: string;
  if (hasTimeCols) {
    query = buildTextPreservingQuery(tableName, filePath, descRows);
  } else {
    query = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${filePath}')`;
  }
  // console.log('nativeCSVImport: executing: ', query);
  try {
    /*
    const resObj = await dbConn.executeIterator(query);
    const resRows = resObj.fetchAllRows() as any[];
*/
    const resRows = await dbConn.all(query);
    // console.log('nativeCSVImport: result: ', resRows[0]);
    const info = resRows[0];
    // console.log('info.Count: \"' + info.Count + '\", type: ', typeof info.Count);
  } catch (err) {
    console.log("caught exception while importing: ", err);
    console.log("retrying with SAMPLE_SIZE=-1:");
    const noSampleQuery = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${filePath}', sample_size=-1)`;
    try {
      /*
      const resObj = await dbConn.executeIterator(noSampleQuery);
      const resRows = resObj.fetchAllRows() as any[];
      */
      const resRows = await dbConn.all(noSampleQuery);
      // console.log('nativeCSVImport: result: ', resRows[0]);
      const info = resRows[0];
      log.debug(
        'nativeCSVImport: info.Count: "' + info.Count + '", type: ',
        typeof info.Count
      );
    } catch (noSampleErr) {
      console.log("caught exception with no sampling: ", noSampleErr);
      throw noSampleErr;
    }
  }
  const importTime = process.hrtime(importStart);
  log.info(
    "DuckDB nativeCSVImport: import completed in ",
    prettyHRTime(importTime)
  );

  return tableName;
};

/**
 * Native import using DuckDB's built-in import facilities.
 */
export const nativeParquetImport = async (
  db: Database,
  filePath: string,
  tableName?: string
): Promise<string> => {
  const importStart = process.hrtime();

  const dbConn = await db.connect();
  await initS3(dbConn);
  if (!tableName) {
    tableName = genTableName(filePath);
  }
  const query = `CREATE OR REPLACE VIEW ${tableName} AS SELECT * FROM parquet_scan('${filePath}')`;
  log.debug("*** parquet import: ", query);
  try {
    // Creating a view doesn't return a useful result.
    await dbConn.exec(query);
  } catch (err) {
    console.log("caught exception while importing: ", err);
    throw err;
  }
  const [es, ens] = process.hrtime(importStart);
  log.info(
    "DuckDB nativeParquetImport: import completed in %ds %dms",
    es,
    ens / 1e6
  );

  return tableName;
};
