import { ColumnType, CoreColumnTypes, ColumnTypeMap, isDateLike } from "../ColumnType";
import { BaseSQLDialect } from "../BaseSQLDialect";
import { isNode } from "../util/environ";
import { getColId, QueryToSqlOptions, SQLQueryAST } from "../SQLQuery";
import { pagedQueryToSql } from "../toSql";
import { LeafSchemaMap } from "../TableRep";
import { QueryRep } from "../QueryRep";

const intCT = new ColumnType("INTEGER", "integer");
const realCT = new ColumnType("DOUBLE", "real");
const textCT = new ColumnType("VARCHAR", "string");
const boolCT = new ColumnType("BOOL", "boolean");

interface DuckDBStringRenderer {
  toDuckDBString(): string;
}

function isDuckDBStringRenderer(val: any): val is DuckDBStringRenderer {
  return (
    val != null &&
    typeof val === "object" &&
    !!(val as DuckDBStringRenderer).toDuckDBString
  );
}

/**
 * Strip a trailing UTC "Z" and normalize any trailing numeric offset to
 * a canonical "±HH:MM" form, preserving fractional seconds verbatim.
 */
const normalizeTimezoneSuffix = (str: string): string => {
  if (str.endsWith("Z")) {
    return str.slice(0, -1) + "+00:00";
  }
  // 仅在确实包含时间成分时才解析尾部偏移，避免把纯日期
  // （如 "2022-02-11"）末尾的 "-11" 误判为时区偏移。
  if (!/[T :]/.test(str)) {
    return str;
  }
  const m = str.match(/([+-]\d{2})(?::?(\d{2}))?$/);
  if (m) {
    const sign = m[1];
    const mins = m[2] ?? "00";
    return str.slice(0, str.length - m[0].length) + `${sign}:${mins}`;
  }
  return str;
};

const createTimestampStringRenderer = (
  dateOnly = false,
  withTimeZone = false
) => ({
  stringRender: (val: any) => {
    if (val == null) {
      return "";
    }
    if (isDuckDBStringRenderer(val)) {
      return val.toDuckDBString();
    }
    // node-duckdb 直接返回 JS Date 时（本地调用/测试场景），
    // 统一转成 UTC ISO 字符串再走文本处理；渲染进程场景收到的
    // 本就是 JSON 序列化后的 ISO 字符串或 DSSQL CAST 后的全精度文本。
    const str = isDateLike(val) ? val.toISOString() : String(val);
    if (dateOnly) {
      return str.split(/[T ]/)[0];
    }
    if (withTimeZone) {
      // 带时区列：显示"时刻 + 明确偏移"。Z 表示 UTC（+00:00），
      // 已带 ±hh[:mm] 偏移的规范化为 ±hh:mm，保留小数秒不做时区转换。
      return normalizeTimezoneSuffix(str).replace("T", " ");
    }
    // 无时区列：原样保留 wall-clock 值与全部小数位（不截断精度），
    // 仅做文本美化（去 Z 后缀、T 转空格）。
    let ret = str;
    if (ret.endsWith("Z")) {
      ret = ret.slice(0, -1);
    }
    ret = ret.replace("T", " ");
    return ret;
  },
});

// see https://duckdb.org/docs/sql/data_types/timestamp
// for timestamp type coverage.
const timestampCT = new ColumnType(
  "TIMESTAMP",
  "timestamp",
  createTimestampStringRenderer()
);

const timestampNSCT = new ColumnType(
  "TIMESTAMP_NS",
  "timestamp",
  createTimestampStringRenderer()
);

const timestampSCT = new ColumnType(
  "TIMESTAMP_S",
  "timestamp",
  createTimestampStringRenderer()
);

const timestampMSCT = new ColumnType(
  "TIMESTAMP_MS",
  "timestamp",
  createTimestampStringRenderer()
);

const datetimeCT = new ColumnType(
  "DATETIME",
  "timestamp",
  createTimestampStringRenderer()
);

const timesWithTimeZoneCT = new ColumnType(
  "TIME WITH TIME ZONE",
  "timestamp",
  createTimestampStringRenderer(false, true)
);

const timestampWithTimeZoneCT = new ColumnType(
  "TIMESTAMP WITH TIME ZONE",
  "timestamp",
  createTimestampStringRenderer(false, true)
);

const timestampTZCT = new ColumnType(
  "TIMESTAMPTZ",
  "timestamp",
  createTimestampStringRenderer(false, true)
);

const dateCT = new ColumnType(
  "DATE",
  "timestamp",
  createTimestampStringRenderer(true)
);

const blobCT = new ColumnType("BLOB", "blob", {
  stringRender: (val: any) => {
    if (val == null) {
      return "";
    }
    if (isDuckDBStringRenderer(val)) {
      return val.toDuckDBString();
    }
    if (isNode() && val instanceof Buffer) {
      return val.toString();
    }
    if (val instanceof Uint8Array) {
      const decoder = new TextDecoder();
      return decoder.decode(val);
    }
    return JSON.stringify(val);
  },
});

/**
 * Render every timestamp column in the outermost projection as a
 * full-precision text value (CAST(... AS VARCHAR)). This bypasses the
 * node-duckdb native binding, which converts timestamps to millisecond
 * precision JS Dates and would otherwise silently truncate microseconds
 * and nanoseconds. Only the outermost select list is rewritten; inner
 * subqueries (used for filtering, grouping, joining, sorting) keep their
 * native temporal types.
 */
const castOuterTimestampsToStrings = (q: SQLQueryAST): SQLQueryAST => ({
  ...q,
  selectStmts: q.selectStmts.map((sel) => ({
    ...sel,
    selectCols: sel.selectCols.map((item) => {
      if (item.colType != null && item.colType.kind === "timestamp") {
        return {
          ...item,
          as: item.as != null ? item.as : getColId(item),
          renderAsString: true,
        };
      }
      return item;
    }),
  })),
});

export class DuckDBDialectClass extends BaseSQLDialect {
  private static instance: DuckDBDialectClass;
  readonly dialectName: string = "duckdb";
  readonly requireSubqueryAlias: boolean = false;
  readonly allowNonConstExtend: boolean = true;
  readonly coreColumnTypes: CoreColumnTypes = {
    integer: intCT,
    real: realCT,
    string: textCT,
    boolean: boolCT,
  };

  readonly columnTypes: ColumnTypeMap = {
    BIGINT: intCT,
    BOOL: boolCT,
    BOOLEAN: boolCT,
    BLOB: blobCT,
    DATE: dateCT,
    DATETIME: datetimeCT,
    DECIMAL: realCT,
    DOUBLE: realCT,
    FLOAT: realCT,
    HUGEINT: intCT,
    INTEGER: intCT,
    REAL: realCT,
    SMALLINT: intCT,
    TINYINT: intCT,
    TEXT: textCT,
    TIME: timestampCT,
    "TIME WITH TIME ZONE": timestampWithTimeZoneCT,
    TIMESTAMP: timestampCT,
    TIMESTAMPTZ: timestampTZCT,
    "TIMESTAMP WITH TIME ZONE": timestampWithTimeZoneCT,
    TIMESTAMP_NS: timestampNSCT,
    TIMESTAMP_S: timestampSCT,
    TIMESTAMP_MS: timestampMSCT,
    UBIGINT: intCT,
    UINTEGER: intCT,
    USMALLINT: intCT,
    UTINYINT: intCT,
    VARCHAR: textCT,
  };

  static getInstance(): DuckDBDialectClass {
    if (!DuckDBDialectClass.instance) {
      DuckDBDialectClass.instance = new DuckDBDialectClass();
    }
    return DuckDBDialectClass.instance;
  }

  queryToSql(
    tableMap: LeafSchemaMap,
    query: QueryRep,
    offset?: number,
    limit?: number,
    options?: QueryToSqlOptions
  ): SQLQueryAST {
    const ret = pagedQueryToSql(this, tableMap, query, offset, limit);
    if (options?.preserveTimestampPrecision) {
      return castOuterTimestampsToStrings(ret);
    }
    return ret;
  }
}

export const DuckDBDialect = DuckDBDialectClass.getInstance();
