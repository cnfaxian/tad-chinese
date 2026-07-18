import * as React from "react";
import { Button } from "@blueprintjs/core";

export interface DelayedCalcFooterProps {
  dirty: boolean;
  onCancel: () => void;
  onApply: () => void;
  onDone: () => void;
}

export const DelayedCalcFooter: React.FunctionComponent<
  DelayedCalcFooterProps
> = ({ dirty, onCancel, onApply, onDone }) => {
  return (
    <div className="delayed-calc-footer">
      <Button text="取消" onClick={(e: any) => onCancel()} />
      <Button disabled={!dirty} text="应用" onClick={(e: any) => onApply()} />
      <Button
        className="bp4-intent-primary"
        onClick={(e: any) => onDone()}
        text="完成"
      />
    </div>
  );
};
