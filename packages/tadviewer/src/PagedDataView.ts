import * as reltab from "reltab";
/*
 * a variant on SimpleDataView that maintains a total row count
 * and a contiguous subset of rows (a viewport) starting from
 * some offset
 */

// Note: This doesn't explicitly include the '_path' or "_sortVal_X_Y" columns
export interface DataRow {
  _isLeaf: boolean;
  _depth: number;
  _pivot: string;
  _isOpen: boolean;
  [columnId: string]: reltab.Scalar;
}

export class PagedDataView {
  schema: reltab.Schema;
  totalRowCount: number;
  offset: number;
  rawData: Array<DataRow>;
  private _selectedRows: Set<number>;
  private _selectedColumns: Set<number>;

  constructor(
    schema: reltab.Schema,
    totalRowCount: number,
    offset: number,
    items: Array<DataRow>
  ) {
    this.schema = schema;
    this.totalRowCount = totalRowCount;
    this.offset = offset;
    this.rawData = items;
    this._selectedRows = new Set();
    this._selectedColumns = new Set();
  }

  setSelectedRows(rows: Set<number>): void {
    this._selectedRows = rows;
  }

  setSelectedColumns(cols: Set<number>): void {
    this._selectedColumns = cols;
  }

  getSelectedColumns(): Set<number> {
    return this._selectedColumns;
  }

  getLength(): number {
    return this.totalRowCount;
  }

  getOffset(): number {
    return this.offset;
  }

  getItemCount(): number {
    return this.rawData.length;
  }

  getItem(index: number): DataRow | null {
    let ret = null;
    const itemIndex = index - this.offset;

    if (itemIndex >= 0 && itemIndex < this.rawData.length) {
      ret = this.rawData[itemIndex];
    } // console.log('getItem(', index, ') ==> itemIndex: ', itemIndex, ', ret: ', ret)

    return ret;
  }

  getItemMetadata(index: number): any {
    let ret: any = {};
    const item = this.getItem(index);

    if (item && !item._isLeaf) {
      ret.cssClasses = "grid-aggregate-row";
    }

    if (this._selectedRows.has(index)) {
      ret.cssClasses = ret.cssClasses
        ? ret.cssClasses + " tad-row-highlight"
        : "tad-row-highlight";
    }

    return ret;
  }
}
