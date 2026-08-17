import { ColumnType, CoreColumnTypes, ColumnTypeMap } from "../ColumnType";
import { BaseSQLDialect } from "../BaseSQLDialect";
import { isNode } from "../util/environ";

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
    // 本就是 JSON 序列化后的 ISO 字符串。
    const str = val instanceof Date ? val.toISOString() : String(val);
    if (dateOnly) {
      return str.split("T")[0];
    }
    if (withTimeZone) {
      // 带时区列：显示"时刻 + 明确偏移"。Z 表示 UTC（+00:00），
      // 已带 ±hh:mm 偏移的保留原始偏移，不做任何时区转换。
      if (str.endsWith("Z")) {
        return str.slice(0, -1).replace(/\.\d+$/, "") + "+00:00";
      }
      if (str.match(/[+-]\d{2}:\d{2}$/)) {
        return str.slice(0, -6).replace(/\.\d+$/, "") + str.slice(-6);
      }
      return str.replace(/\.\d+$/, "");
    }
    // 无时区列：原样保留 wall-clock 值，仅做文本美化
    // （去 Z 后缀、去毫秒、T 转空格），不附加任何时区偏移。
    let ret = str;
    if (ret.endsWith("Z")) {
      ret = ret.slice(0, -1);
    }
    ret = ret.replace(/\.\d+$/, "");
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
}

export const DuckDBDialect = DuckDBDialectClass.getInstance();
