import * as React from "react";
import { default as ReactDefault, useEffect, useRef, useCallback } from "react";
import { ActivityBar } from "./ActivityBar";
import { PivotSidebar } from "./PivotSidebar";
import { DataSourceSidebar } from "./DataSourceSidebar";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  FocusStyleManager,
  Button,
  Dialog,
  Classes,
  ProgressBar,
  FormGroup,
  InputGroup,
  HTMLSelect,
  Text,
  Collapse,
} from "@blueprintjs/core";
import { GridPane, OpenURLFn } from "./GridPane";
import { Footer } from "./Footer";
import { LoadingModal } from "./LoadingModal";
import * as actions from "../actions";
import {
  AppState,
  ExportFormat,
  ParquetExportOptions,
  defaultParquetExportOptions,
} from "../AppState";
import * as oneref from "oneref";
import { useState } from "react";
import { Activity } from "./defs";
import { mutableGet, StateRef } from "oneref";
import { DataSourcePath, FilterExp, ReltabConnection, resolvePath } from "reltab";
import { useDeepCompareEffect } from "use-deep-compare";
import { Timer } from "../Timer";
import { SimpleClipboard } from "./SimpleClipboard";
import { CellClickData } from "./CellClickData";
import { createDragDropManager } from "dnd-core";
import { SelectionChangeData } from "./SelectionChangeData";
/**
 * top level application pane
 */

export type NewWindowFn = (
  path: DataSourcePath,
  stateRef: StateRef<AppState>
) => void;

export interface AppPaneBaseProps {
  newWindow: NewWindowFn;
  openURL: OpenURLFn;
  showDataSources?: boolean;
  clipboard: SimpleClipboard;
  embedded: boolean;
  rightFooterSlot?: JSX.Element;
  onFilter?: (filterExp: FilterExp) => void;
  onBrowseExportPath?: (exportFormat: ExportFormat) => void;
  onExportFile?: (
    exportFormat: ExportFormat,
    exportPath: string,
    parquetExportOptions: ParquetExportOptions
  ) => void;
  onCellClick?: (cell: CellClickData) => void;
  onSelectionChange?: (data: SelectionChangeData) => void;
}

export type AppPaneProps = AppPaneBaseProps & oneref.StateRefProps<AppState>;

const handleExportBeginDialogClose = (stateRef: StateRef<AppState>) => {
  actions.setExportBeginDialogOpen(false, stateRef);
};

const handleExportProgressDialogClose = (stateRef: StateRef<AppState>) => {
  actions.setExportProgressDialogOpen(false, "", stateRef);
};

const handleViewConfirmDialogReplace = async (stateRef: StateRef<AppState>) => {
  const appState = mutableGet(stateRef);
  actions.setViewConfirmDialogOpen(false, null, stateRef);
  actions.replaceCurrentView(appState.viewConfirmSourcePath!, stateRef);
};

const handleViewConfirmDialogNewWindow = (
  newWindow: NewWindowFn,
  stateRef: StateRef<AppState>
) => {
  const appState = mutableGet(stateRef);
  actions.setViewConfirmDialogOpen(false, null, stateRef);
  newWindow(appState.viewConfirmSourcePath!, stateRef);
};

const handleViewConfirmDialogClose = (stateRef: StateRef<AppState>) => {
  actions.setViewConfirmDialogOpen(false, null, stateRef);
};

type ExportDialogProps = oneref.StateRefProps<AppState>;

const ExportProgressDialog: React.FunctionComponent<ExportDialogProps> = ({
  appState,
  stateRef,
}: ExportDialogProps) => {
  let filterCountStr = "";

  const { viewState, exportPercent } = appState;

  const isBusy = exportPercent < 1;
  const isComplete = !isBusy;
  const okButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isComplete) {
      setTimeout(() => {
        okButtonRef.current?.focus();
      }, 0);
    }
  }, [isComplete, okButtonRef]);

  if (
    appState.initialized &&
    viewState !== null &&
    viewState.dataView !== null
  ) {
    const viewParams = viewState.viewParams;
    const queryView = appState.viewState.queryView;

    if (queryView) {
      const { filterRowCount } = queryView;
      filterCountStr = filterRowCount.toLocaleString(undefined, {
        useGrouping: true,
      });
    }
  }

  const exportWord = isBusy ? "正在导出" : "已导出";
  const exportEllipsis = isBusy ? "..." : "";
  const exportText = `${exportWord} ${filterCountStr} 行到 ${appState.exportPathBaseName}${exportEllipsis}`;
  return (
    <Dialog
      title="导出文件"
      onClose={() => handleExportProgressDialogClose(stateRef)}
      isOpen={appState.exportProgressDialogOpen}
    >
      <div className={Classes.DIALOG_BODY}>
        <Text className="bp4-text-large" ellipsize={true}>
          {exportText}
        </Text>
        <br />
        <ProgressBar stripes={isBusy} />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            disabled={isBusy}
            autoFocus={true}
            elementRef={okButtonRef}
            onClick={() => handleExportProgressDialogClose(stateRef)}
          >
            确定
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

type ParquetOptionsSectionProps = {
  parquetExportOptions: ParquetExportOptions;
  onUpdateParquetOptions: (opts: ParquetExportOptions) => void;
};

export const ParquetOptionsSection: React.FunctionComponent<
  ParquetOptionsSectionProps
> = ({
  parquetExportOptions,
  onUpdateParquetOptions,
}: ParquetOptionsSectionProps) => {
  const { compression } = parquetExportOptions;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Button onClick={() => setIsExpanded(!isExpanded)}>
        Parquet 选项...
      </Button>
      <Collapse isOpen={isExpanded}>
        <div className={Classes.DIALOG_BODY}>
          <FormGroup
            inline={true}
            label="压缩方式"
            labelFor="parquet-compression-select"
          >
            <HTMLSelect
              id="parquet-compression-select"
              value={compression}
              onChange={(e) =>
                onUpdateParquetOptions({ compression: e.target.value as any })
              }
              options={[
                { label: "uncompressed", value: "uncompressed" },
                { label: "snappy", value: "snappy" },
                { label: "gzip", value: "gzip" },
                { label: "zstd", value: "zstd" },
              ]}
            />
          </FormGroup>
        </div>
      </Collapse>
    </>
  );
};
type ExportBeginDialogProps = oneref.StateRefProps<AppState> & {
  onBrowseExportPath?: (exportFormat: ExportFormat) => void;
  onExportFile?: (
    exportFormat: ExportFormat,
    exportPath: string,
    parquetExportOptions: ParquetExportOptions
  ) => void;
};

const ExportBeginDialog: React.FunctionComponent<ExportBeginDialogProps> = ({
  appState,
  stateRef,
  onBrowseExportPath,
  onExportFile,
}: ExportBeginDialogProps) => {
  let filterCountStr = "";

  // I tried using the Blueprint Dialog autoFocus prop, but it didn't work
  // So let's try setting focus explicitly using an async handler:
  const pathButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);

  const { viewState, exportBeginDialogOpen, exportPath, exportFormat } =
    appState;
  const hasPath = exportPath != null && exportPath.length > 0;

  useEffect(() => {
    if (exportBeginDialogOpen) {
      // Delay the focus to allow the dialog to fully render
      setTimeout(() => {
        const focusButtonRef = hasPath ? exportButtonRef : pathButtonRef;
        focusButtonRef.current?.focus();
        console.log("focus effect: ", hasPath, focusButtonRef.current);
      }, 0);
    }
  }, [exportBeginDialogOpen, hasPath, exportButtonRef, pathButtonRef]);

  const [parquetExportOptions, setParquetExportOptions] = useState(
    defaultParquetExportOptions
  );

  if (
    appState.initialized &&
    viewState !== null &&
    viewState.dataView !== null
  ) {
    const viewParams = viewState.viewParams;
    const queryView = appState.viewState.queryView;

    if (queryView) {
      const { filterRowCount } = queryView;
      filterCountStr = filterRowCount.toLocaleString(undefined, {
        useGrouping: true,
      });
    }
  }
  const parquetOptionsSection =
    exportFormat === "parquet" ? (
      <ParquetOptionsSection
        parquetExportOptions={parquetExportOptions}
        onUpdateParquetOptions={setParquetExportOptions}
      />
    ) : null;

  return (
    <Dialog
      title="导出"
      onClose={() => handleExportBeginDialogClose(stateRef)}
      isOpen={appState.exportBeginDialogOpen}
    >
      <div className={Classes.DIALOG_BODY}>
        <p className="bp4-text-large">导出 {filterCountStr} 行</p>
        <FormGroup label="文件格式" labelFor="export-format-select">
          <HTMLSelect
            id="export-format-select"
            value={exportFormat}
            onChange={(e) =>
              actions.setExportFormat(e.target.value as ExportFormat, stateRef)
            }
            options={[
              { label: "Parquet", value: "parquet" },
              { label: "CSV", value: "csv" },
            ]}
          />
        </FormGroup>
        <FormGroup label="导出到文件" labelFor="export-path">
          <InputGroup
            id="export-path"
            value={exportPath}
            onChange={(e) => actions.setExportPath(e.target.value, stateRef)}
            rightElement={
              <Button
                icon="folder-open"
                minimal
                elementRef={pathButtonRef}
                intent={hasPath ? undefined : "primary"}
                onClick={(e) => onBrowseExportPath?.(exportFormat)}
              />
            }
          />
        </FormGroup>
        {parquetOptionsSection}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            disabled={!hasPath}
            intent={hasPath ? "primary" : undefined}
            elementRef={exportButtonRef}
            onClick={() => {
              actions.setExportBeginDialogOpen(false, stateRef);
              onExportFile?.(exportFormat, exportPath, parquetExportOptions);
            }}
          >
            Export
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

interface ViewConfirmDialogBaseProps {
  newWindow: NewWindowFn;
}

type ViewConfirmDialogProps = ViewConfirmDialogBaseProps &
  oneref.StateRefProps<AppState>;

const ViewConfirmDialog: React.FunctionComponent<ViewConfirmDialogProps> = ({
  newWindow,
  appState,
  stateRef,
}: ViewConfirmDialogProps) => {
  return (
    <Dialog
      title="打开表"
      onClose={() => handleViewConfirmDialogClose(stateRef)}
      isOpen={appState.viewConfirmDialogOpen}
    >
      <div className={Classes.DIALOG_BODY}>
        <p className="bp4-text-large">
          当前视图有未保存的更改。<br />
          是否：
        </p>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={() => handleViewConfirmDialogReplace(stateRef)}>
            替换当前视图
          </Button>
          <Button
            onClick={() =>
              handleViewConfirmDialogNewWindow(newWindow, stateRef)
            }
          >
            在新窗口中打开
          </Button>
          <Button
            intent="primary"
            onClick={() => handleViewConfirmDialogClose(stateRef)}
          >
            取消
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

async function setTitleFromDSPath(
  rtc: ReltabConnection,
  dsPath: DataSourcePath
) {
  const node = await resolvePath(rtc, dsPath);
  const title = "Tad - " + node.displayName;
  document.title = title;
}

function timerShowModal(timer: Timer): boolean {
  return timer.running && timer.elapsed > 500;
}

const dndManager = createDragDropManager(HTML5Backend);

export const AppPane: React.FunctionComponent<AppPaneProps> = ({
  newWindow,
  appState,
  stateRef,
  clipboard,
  showDataSources: rawShowDataSources,
  openURL,
  embedded,
  rightFooterSlot,
  onFilter,
  onBrowseExportPath,
  onExportFile,
  onCellClick,
  onSelectionChange
}: AppPaneProps) => {
  const { activity, exportBeginDialogOpen } = appState;
  const dataSourceExpanded = activity === "DataSource";
  const pivotPropsExpanded = activity === "Pivot";
  let mainContents: JSX.Element | null = null;
  const showDataSources =
    rawShowDataSources === undefined ? true : rawShowDataSources;

  const { rtc, viewState } = appState;

  let dsPath = viewState?.dsPath;

  useDeepCompareEffect(() => {
    if (rtc && dsPath) {
      setTitleFromDSPath(rtc, dsPath);
    }
  }, [dsPath]);

  let centerPane: JSX.Element | null;

  // We should probably make pivot sidebar deal better with an empty table, but...
  let pivotSidebar: JSX.Element | null;

  if (
    appState.initialized &&
    viewState !== null &&
    viewState.dataView !== null
  ) {
    pivotSidebar = (
      <PivotSidebar
        expanded={pivotPropsExpanded}
        schema={viewState.baseSchema}
        viewParams={viewState.viewParams}
        delayedCalcMode={viewState.delayedCalcMode}
        embedded={embedded}
        stateRef={stateRef}
      />
    );
    const loadingModal =
      timerShowModal(appState.appLoadingTimer) ||
      timerShowModal(viewState.loadingTimer) ? (
        <LoadingModal embedded={embedded} />
      ) : null;
    centerPane = (
      <div className="center-app-pane">
        {loadingModal}
        <GridPane
          appState={appState}
          viewState={appState.viewState}
          stateRef={stateRef}
          clipboard={clipboard}
          openURL={openURL}
          embedded={embedded}
          onCellClick={onCellClick}
          onSelectionChange={onSelectionChange}
        />
        <Footer
          appState={appState}
          stateRef={stateRef}
          rightFooterSlot={rightFooterSlot}
          onFilter={onFilter}
        />
      </div>
    );
  } else {
    pivotSidebar = null;
    centerPane = timerShowModal(appState.appLoadingTimer) ? (
      <LoadingModal embedded={embedded} />
    ) : null;
  }
  const dataSourceSidebar = showDataSources ? (
    <DataSourceSidebar expanded={dataSourceExpanded} stateRef={stateRef} />
  ) : null;
  mainContents = (
    <div className="container-fluid full-height main-container tad-app-pane">
      <DndProvider manager={dndManager}>
        <ActivityBar
          activity={activity}
          showDataSources={showDataSources}
          stateRef={stateRef}
        />
        {dataSourceSidebar}
        {pivotSidebar}
        {centerPane}
      </DndProvider>
      <ExportBeginDialog
        appState={appState}
        stateRef={stateRef}
        onBrowseExportPath={onBrowseExportPath}
        onExportFile={onExportFile}
      />
      <ExportProgressDialog appState={appState} stateRef={stateRef} />
      <ViewConfirmDialog
        newWindow={newWindow}
        appState={appState}
        stateRef={stateRef}
      />
    </div>
  );
  return mainContents;
};

// Useful for checking for duplicate React versions
export const tadReact = ReactDefault;
