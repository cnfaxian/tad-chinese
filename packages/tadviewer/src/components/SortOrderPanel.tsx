import * as React from "react";
import { ColumnList } from "./ColumnList";
import { ColumnListTypes } from "./defs";
import { Schema } from "reltab";
import { ViewParams } from "../ViewParams";
import * as actions from "../actions";
import * as reltab from "reltab";
import { StateRef } from "oneref";
import { AppState } from "../AppState";

const dirSelect = (
  viewParams: ViewParams,
  schema: Schema,
  cid: string,
  asc: boolean,
  updater: any
) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const asc = event.target.value === "asc";
    actions.setSortDir(cid, asc, updater);
  };

  const selectVal = asc ? "asc" : "desc";
  return (
    <div className="bp4-select bp4-minimal">
      <select value={selectVal} onChange={handleChange}>
        <option value="asc">升序</option>
        <option value="desc">降序</option>
      </select>
    </div>
  );
};

const sortKeyRowFormatter =
  (viewParams: ViewParams, stateRef: any) =>
  (schema: Schema, row: [string, boolean]) => {
    const [cid, asc] = row;
    const displayName = schema.displayName(cid);
    const select = dirSelect(viewParams, schema, cid, asc, stateRef);
    return [
      <td key={cid} className="col-colName">
        {displayName}
      </td>,
      <td key={"sortDir-" + cid}>{select}</td>,
    ];
  };

export interface SortOrderPanelProps {
  schema: reltab.Schema;
  viewParams: ViewParams;
  stateRef: StateRef<AppState>;
}

export const SortOrderPanel: React.FC<SortOrderPanelProps> = ({
  schema,
  viewParams,
  stateRef,
}) => {
  return (
    <div className="ui-block">
      <h6 className="bp4-heading">
        排序列 <span className="bp4-ui-text">（拖动重新排序）</span>
      </h6>
      <ColumnList
        schema={schema}
        columnListType={ColumnListTypes.SORT}
        headerLabels={["排序方向"]}
        items={viewParams.sortKey}
        rowFormatter={sortKeyRowFormatter(viewParams, stateRef)}
        stateRef={stateRef}
      />
    </div>
  );
};
