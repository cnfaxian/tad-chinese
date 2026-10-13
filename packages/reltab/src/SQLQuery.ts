import { JoinType } from "./QueryRep";
import { ValExp, ColumnExtendExp, col } from "./defs";
import { FilterExp } from "./FilterExp";
import { AggFn } from "./AggFn";
import { ColumnType } from "./ColumnType";

/* AST for generating SQL queries */
/* internal only -- should not be re-exported from reltab */

export interface SQLAggExp {
  expType: "agg";
  aggFn: AggFn;
  exp: ValExp;
}
export const mkAggExp = (aggFn: AggFn, exp: ValExp): SQLAggExp => ({
  expType: "agg",
  aggFn,
  exp,
});

export type SQLValExp = ColumnExtendExp | SQLAggExp;

export type SQLSelectListItem = {
  colExp: SQLValExp;
  colType: ColumnType; // needed by some dialects, like BigQuery
  as?: string;
  /**
   * When true, the rendered select expression will be wrapped in a
   * CAST(... AS VARCHAR) so the value is returned as text. Used to
   * preserve full timestamp precision on dialects whose driver would
   * otherwise truncate it.
   */
  renderAsString?: boolean;
};

export const mkColSelItem = (
  cid: string,
  colType: ColumnType,
  tblAlias?: string
): SQLSelectListItem => ({
  colExp: col(cid, tblAlias),
  colType,
});

export type SQLSortColExp = {
  col: string;
  asc: boolean;
};
export type SQLFromJoin = {
  expType: "join";
  joinType: JoinType;
  lhs: SQLQueryAST;
  lhsTblAlias: string;
  rhs: SQLQueryAST;
  rhsTblAlias: string;
};
export type SQLFromQuery = {
  expType: "query";
  query: SQLQueryAST;
};
export type SQLSelectAST = {
  selectCols: Array<SQLSelectListItem>;
  from: string | SQLFromQuery | SQLFromJoin;
  on?: Array<string>;
  where?: FilterExp;
  groupBy: Array<string>;
  orderBy: Array<SQLSortColExp>;
};
export type SQLQueryAST = {
  // all underliers combined via `union all`
  selectStmts: Array<SQLSelectAST>;
  offset?: number;
  limit?: number;
};

/**
 * Optional knobs controlling SQL generation.
 */
export interface QueryToSqlOptions {
  /**
   * When true, dialects that truncate timestamp values (e.g. DuckDB, whose
   * native binding converts timestamps to millisecond-precision JS Dates)
   * should render timestamp columns in the outermost projection as
   * full-precision text (CAST(... AS VARCHAR)) so no precision is lost.
   * Used for display queries only; export queries omit it to preserve
   * native temporal types.
   */
  preserveTimestampPrecision?: boolean;
}

/**
 * get Column Id from a SQLSelectListItem -- essential when hoisting column names from
 * subquery
 * Throws if column id not explicit
 */
export const getColId = (cexp: SQLSelectListItem): string => {
  let ret: string;
  if (cexp.as != null) {
    ret = cexp.as;
  } else {
    const { colExp } = cexp;
    switch (colExp.expType) {
      case "ColRef":
        ret = colExp.colName;
        break;
      case "agg":
        ret = colExp.aggFn;
        break;
      default:
        throw new Error(
          `getColId: could not determine column id from select list item of expType ${colExp.expType}: ` +
            colExp.toString()
        );
    }
  }
  return ret;
};

/**
 * Turn a SelectListItem from a query into a SelectListItem for use by an outer query:
 */
const subSelectListItem = (cexp: SQLSelectListItem): SQLSelectListItem => {
  let cid: string;
  if (cexp.as != null) {
    cid = cexp.as;
  } else {
    const { colExp } = cexp;
    switch (colExp.expType) {
      case "ColRef":
        cid = colExp.colName;
        break;
      case "agg":
        cid = colExp.aggFn;
        break;
      default:
        throw new Error(
          `getColId: could not determine column id from select list item of expType ${colExp.expType}: ` +
            colExp.toString()
        );
    }
  }
  const ret = {
    colExp: col(cid),
    colType: cexp.colType,
  };
  return ret;
};

/*
 * We make this an explicit function to allow returning some rep of 'select *' in future:
 */
export const mkSubSelectList = (
  selectCols: SQLSelectListItem[]
): SQLSelectListItem[] => selectCols.map(subSelectListItem);
