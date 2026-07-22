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

const pad2 = (n: number): string => String(n).padStart(2, "0");

const getTimezoneOffset = (d: Date): string => {
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = pad2(Math.floor(Math.abs(offset) / 60));
  const minutes = pad2(Math.abs(offset) % 60);
  return `${sign}${hours}:${minutes}`;
};

const formatLocalDateTime = (d: Date): string => {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
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
    let retStr: string;
    try {
      const d = new Date(val);
      if (withTimeZone) {
        retStr = formatLocalDateTime(d) + getTimezoneOffset(d);
      } else if (dateOnly) {
        retStr = d.toISOString().split("T")[0];
      } else {
        retStr = formatLocalDateTime(d);
      }
    } catch (err) {
      if (err instanceof RangeError) {
        console.info(
          "*** DuckDbDialect: Error converting Invalid time value: ",
          val
        );
      } else {
        console.warn(
          "*** DuckDbDialect: Error converting timestamp: ",
          val,
          err
        );
      }
      retStr = String(val);
    }
    return retStr;
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
