import {OdaPmTask, setTaskPriority} from "../../data-model/OdaPmTask";
import OdaPmToolPlugin from "../../main";
import {
    I_OdaPmStep,
    I_OdaPmWorkflow,
    Tag_Prefix_Step,
    Tag_Prefix_TaskType,
    Tag_Prefix_Workflow,
    TaskStatus_checked,
    TaskStatus_unchecked
} from "../../data-model/workflow-def";
import {openTaskPrecisely, rewriteTask} from "../../utils/io-util";
import React, {MouseEvent, ReactElement, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {useTaskSelection} from "./hooks/use-task-selection";
import {TaskSelectionToolbar} from "./components/task-selection-toolbar";

// Context for passing selection mode state to child components
const SelectionModeContext = React.createContext<boolean>(false);
import {
    getForceNewTabOnClick,
    getSettings,
    setSettingsValueAndSave,
    TableSortBy,
    TableSortData,
    TableSortMethod,
    TaskPriority,
    totalSortMethods,
    usePluginSettings
} from "../../settings/settings";
import {Evt_JumpTask, Evt_JumpWorkflow} from "../../typing/dataview-event";
import {initialToUpper, isStringNullOrEmpty, simpleFilter} from "../../utils/format-util";
import {HStack, VStack} from "../pure-react/view-template/h-stack";
import {ClickableObsidianIconView, InternalLinkView} from "./obsidian-icon-view";
import {ExternalControlledCheckbox} from "../pure-react/view-template/checkbox";
import {PaginatedDataTable} from "../pure-react/view-template/data-table";
import {IRenderable} from "../pure-react/props-typing/i-renderable";
import {DataArray} from "obsidian-dataview";
import {MarkdownRenderer} from "obsidian";
import {HtmlStringComponent} from "../pure-react/view-template/html-string-component";
import {appendBoldText} from "../common/html-template";
import {notify} from "../../utils/o-notice";
import {centerChildren, centerChildrenVertStyle, diffGroupSpacing, getStickyHeaderStyle} from "../pure-react/style-def";
import {Minus} from "../pure-react/icon/Minus";
import {DownAZ, UpAZ} from "../pure-react/icon/DownAZ";
import {Down01, Up01} from "../pure-react/icon/Down01";
import {ArrowBigDown, ArrowBigDownDash, ArrowBigUp, ArrowBigUpDash} from "../pure-react/icon/ArrowBigUpDash";
import {OdaPmDbProvider} from "../../data-model/OdaPmDb";
import {HoveringPopup} from "../pure-react/view-template/hovering-popup";
import {CircleHelp} from "../pure-react/icon/CircleHelp";
import {devLog, isDevMode} from "../../utils/env-util";
import {I_GetTaskSource} from "../../data-model/TaskSource";
import {TaskSource} from "../../data-model/TaskSource";
import {I_Stylable} from "../pure-react/props-typing/i-stylable";
import {loopIndex} from "../pure-react/utils/loop-index";
import {getColorByWorkflow, getIconByWorkflow, getWorkflowChipStyle} from "./tag-project-style";
import {ClickableView} from "../pure-react/view-template/clickable-view";
import {addTagText} from "../../data-model/tag-text-manipulate";
import {Tag_Prefix_Project} from "../../data-model/OdaPmProject";
import {ContextMenu, ContextMenuItem} from "../pure-react/view-template/context-menu";
import {WorkflowSuggestionModal} from "../obsidian/workflow-suggestion-modal";
import {PrioritySuggestionModal} from "../obsidian/priority-suggestion-modal";
import {
    batchChangeWorkflow,
    batchSetPriority,
    notifyBatchOperationResult
} from "../../utils/task-batch-util";
import {
    filterCardStyle,
    filterInputStyle,
    tableContainerStyle as sharedTableContainerStyle,
    tableElementStyle as sharedTableElementStyle
} from "./filter-card-styles";

export const taskCheckBoxMargin = {marginLeft: 3};

/** Task table wrapper: extends shared table container with fixed height for sticky header. */
const taskTableContainerStyle: React.CSSProperties = {
    ...sharedTableContainerStyle,
    maxHeight: "70vh",
};
const tableRowEvenBg: React.CSSProperties = { backgroundColor: "var(--background-secondary-alt)" };
const tableRowOddBg: React.CSSProperties = { backgroundColor: "var(--background-primary)" };
const summaryCellBase: React.CSSProperties = {
    padding: "10px 14px",
    minWidth: 300,
    maxWidth: 300,
    width: "auto",
    verticalAlign: "middle",
};
const stepCellBase: React.CSSProperties = {
    textAlign: "center",
    padding: "10px 14px",
    width: "auto",
    verticalAlign: "middle",
};
const tableHeaderBase: React.CSSProperties = {
    borderBottom: "2px solid var(--background-modifier-border)",
    fontWeight: 600,
    padding: "12px 14px",
    fontSize: "0.95em",
};
const summaryCellInnerStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 0",
};
/** Step cell: checkbox only, no background wrapper. */
const stepCellCheckboxStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    margin: 0,
    padding: 0,
};
function getIconByTask(oTask: OdaPmTask) {
    return getIconByWorkflow(oTask.type)
}

function notifyTask(oTask: OdaPmTask, reason: string) {
    const doc = new DocumentFragment();
    appendBoldText(doc, reason);
    doc.appendText("\n")
    doc.appendText(oTask.summary)
    notify(doc, 4)
}


/**
 * The first column of the table, which is a checkbox representing the task.
 * @param oTask
 * @param plugin
 * @param taskFirstColumn
 * @constructor
 */
export const OdaTaskSummaryCell = ({oTask, taskFirstColumn, showCheckBox, showPriority, showWorkflowIcon, disableInteractions}: {
    oTask: OdaPmTask,
    taskFirstColumn: IRenderable,
    showPriority?: boolean
    showCheckBox?: boolean
    showWorkflowIcon?: boolean
    disableInteractions?: boolean // When true, disables all click interactions (for selection mode)
}) => {
    showCheckBox = showCheckBox ?? true // backward compatibility
    showWorkflowIcon = showWorkflowIcon ?? true
    showPriority = showPriority ?? true

    const plugin = useContext(PluginContext);
    const workspace = plugin.app.workspace;
    const [summaryView, setSummaryView] = useState<ReactElement>();

    function tickSummary() {
        // Automatically add tags when checking in manage page 

        let nextStatus = TaskStatus_unchecked;
        let oriText = oTask.text;
        if (!oTask.stepCompleted()) {
            // k.boundTask.checked = !k.boundTask.checked// No good, this is dataview cache.

            // - State: unticked. Behaviour: tick summary. Outcome: All steps ticked.
            nextStatus = TaskStatus_checked;
            oriText = oTask.completeStepTag();
        } else {
            // 	State: all ticked. Behaviour: untick summary. Outcome: untick all step.
            oriText = oTask.removeAllStepTags();
        }
        rewriteTask(plugin.app.vault, oTask.boundTask,
            nextStatus, oriText) // trigger rerender
    }

    useEffect(() => {
        // console.log(`Task: ${oTask.boundTask.text}. Md: ${oTask.isMdCompleted()} ${oTask.stepCompleted()}.`)
        // Changed to ExternalControlledCheckbox. The checkbox status is determined by whether all steps are completed.
        const summaryMd = getSettings()?.capitalize_table_row_initial ?
            initialToUpper(taskFirstColumn) :
            taskFirstColumn;
        const container = createEl("span"); // TODO performance, each summary cell has one virtual container.

        // @ts-ignore
        MarkdownRenderer.render(plugin.app, summaryMd, container, oTask.boundTask.path, plugin).then(() => {
            // container.children[0] is a <p>, so we only use its innerHTML
            setSummaryView(<HtmlStringComponent style={taskCheckBoxMargin}
                                                htmlString={container.children[0].innerHTML}/>);
        })
    }, [oTask, plugin, taskFirstColumn]);

    const checkBoxContent = showCheckBox ? <span>
        <InternalLinkView content={summaryView}/>
    </span> // click event is handled in ExternalControlledCheckbox, so handling it here will cause double click.
        : <span>
            <InternalLinkView 
                content={summaryView} 
                onIconClicked={disableInteractions ? undefined : openThisTask} 
                onContentClicked={disableInteractions ? undefined : openThisTask}
            />
        </span>;
    const workflowLabel = showWorkflowIcon ? (
        <span style={getWorkflowChipStyle(getColorByWorkflow(oTask.type))} title={oTask.type.name}>
            {getIconByTask(oTask)}
            <span>{oTask.type.name}</span>
        </span>
    ) : null;

    const cellContent = (
        <span style={summaryCellInnerStyle}>
            <VStack spacing={3} style={{ alignItems: "flex-start" }}>
                <HStack style={centerChildren} spacing={6}>
                    {showPriority && <TaskPriorityIcon oTask={oTask} />}
                    {showCheckBox ? (
                        <ExternalControlledCheckbox
                            content={checkBoxContent}
                            onChange={disableInteractions ? () => {} : tickSummary}
                            onContentClicked={disableInteractions ? undefined : openThisTask}
                            externalControl={oTask.stepCompleted()}
                        />
                    ) : (
                        checkBoxContent
                    )}
                </HStack>
                {workflowLabel}
            </VStack>
        </span>
    );
    const sourceTitle = isDevMode() ? TaskSource.formatForTooltip((oTask as I_GetTaskSource).getSource() ?? null) : undefined;
    return <span title={sourceTitle || undefined}>{cellContent}</span>;

    function openThisTask(event: MouseEvent) {
        const forceNewTab = getForceNewTabOnClick(plugin, event);
        devLog(`[taskview] Open this task alt: ${event.altKey} shift: ${event.shiftKey} ctrl: ${event.ctrlKey} meta: ${event.metaKey} forceNewTab: ${forceNewTab}`)
        openTaskPrecisely(workspace, oTask.boundTask, forceNewTab);
    }


};

/**
 * in the case that users manipulate the checkbox in markdown, we update the step tags accordingly.
 * @param oTask
 * @param plugin
 */
function rectifyOdaTaskOnMdTaskChanged(oTask: OdaPmTask, plugin: OdaPmToolPlugin) {
    // TODO Retain the original task status, do not always use TaskStatus_checked
    if (!oTask.isMdCompleted() && oTask.stepCompleted()) {
        //  State: summary unticked, all steps are ticked. Outcome: auto tick summary and the original task.
        rewriteTask(plugin.app.vault, oTask.boundTask, TaskStatus_checked, oTask.boundTask.text)
        notifyTask(oTask, `All steps completed: `)
    } else if (oTask.isMdCompleted() && !oTask.stepCompleted()) {
        //State: summary ticked, not all steps are ticked. Outcome: auto add step tags.
        rewriteTask(plugin.app.vault, oTask.boundTask, TaskStatus_checked, oTask.completeStepTag())
        notifyTask(oTask, `Main task completed: `)
    }
    // chain only
    if (oTask.type.type == "chain") {
        if (oTask.tickedSteps.length > 1) {

            // (new) State: summary ticked, multiple steps are ticked. Behaviour: None. Outcome: we use the tag added at the end of the line.
            const stepTag = oTask.getLastStep()?.tag;
            const nextStatus = oTask.lackOnlyOneStep(stepTag) ? TaskStatus_checked : TaskStatus_unchecked;
            rewriteTask(plugin.app.vault, oTask.boundTask, nextStatus, oTask.keepOneStepTag(stepTag))
            notifyTask(oTask, `Keep the last step: `)
        }
    }
}

const DEFAULT_STEP_COLUMN_WIDTH = 80;
const MIN_COLUMN_WIDTH = 60;
const MAX_SUMMARY_WIDTH = 600;
const MAX_STEP_COLUMN_WIDTH = 400;
const SUMMARY_COLUMN_INDEX = 0;

function padColumnWidths(widths: number[], columnCount: number): number[] {
    const w = [...(widths || [300])];
    while (w.length < columnCount) w.push(DEFAULT_STEP_COLUMN_WIDTH);
    return w.slice(0, columnCount);
}

export function getDefaultTableStyleGetters(
    columnWidths?: number[],
    summaryColumn = 0,
    isCellCentered = true
) {
    function getColumnWidth(columnIndex: number): number {
        if (columnWidths && columnWidths[columnIndex] != null) return columnWidths[columnIndex];
        return columnIndex === summaryColumn ? 300 : DEFAULT_STEP_COLUMN_WIDTH;
    }

    function cellStyleGetter(column: number, row: number): React.CSSProperties {
        const even = row % 2 === 0;
        const w = getColumnWidth(column);
        const widthStyle: React.CSSProperties = {
            width: w,
            minWidth: w,
            maxWidth: column === summaryColumn ? MAX_SUMMARY_WIDTH : w,
        };
        const stepCellStyle: React.CSSProperties = {
            ...stepCellBase,
            textAlign: isCellCentered ? "center" : "inherit",
            ...widthStyle,
        };
        const summaryCellStyle: React.CSSProperties = {
            ...summaryCellBase,
            ...widthStyle,
        };
        const stepEvenCellStyle = { ...stepCellStyle, ...tableRowEvenBg };
        const stepOddCellStyle = { ...stepCellStyle, ...tableRowOddBg };
        const summaryEvenCellStyle = { ...summaryCellStyle, ...tableRowEvenBg };
        const summaryOddCellStyle = { ...summaryCellStyle, ...tableRowOddBg };
        const cellStyle = even ? stepEvenCellStyle : stepOddCellStyle;
        const summaryStyle = even ? summaryEvenCellStyle : summaryOddCellStyle;
        if (column === summaryColumn) return summaryStyle;
        return cellStyle;
    }

    function headStyleGetter(columnIndex: number): React.CSSProperties {
        const w = getColumnWidth(columnIndex);
        return {
            ...getStickyHeaderStyle(1, 0),
            ...tableHeaderBase,
            width: w,
            minWidth: w,
            maxWidth: columnIndex === summaryColumn ? MAX_SUMMARY_WIDTH : w,
        } as React.CSSProperties;
    }

    return { cellStyleGetter, headStyleGetter, getColumnWidth };
}

/** Table wrapper and table element styles for PaginatedTaskTable */
export function getTaskTableLayoutStyles() {
    return { tableContainerStyle: taskTableContainerStyle, tableElementStyle: sharedTableElementStyle };
}


function getNameSortIcon(columnSort: TableSortData) {

    switch (columnSort.sortBy) {
        case TableSortBy.Name:
            return getNameSortIcon(columnSort.method)
        case TableSortBy.Priority:
            return getPrioritySortIcon(columnSort.method);
        case TableSortBy.Step:
        default:
            return getNameSortIcon(TableSortMethod.Appearance)
    }

    function getNameSortIcon(method: TableSortMethod) {
        return method === TableSortMethod.Ascending ? <UpAZ/> :
            method === TableSortMethod.Descending ? <DownAZ/> : <Minus/>;
    }

    function getPrioritySortIcon(method: TableSortMethod) {
        // Ascending: high to low
        return method === TableSortMethod.Ascending ? <ArrowBigUpDash/> :
            method === TableSortMethod.Descending ? <ArrowBigDownDash/> : <Minus/>;
    }
}

function getStepSortIcon(method: TableSortMethod) {
    return method === TableSortMethod.Ascending ? <Up01/> :
        method === TableSortMethod.Descending ? <Down01/> : <Minus/>;

}

export function getPriorityIcon(idx: number) {
    switch (idx) {
        case TaskPriority.High:
            return <ArrowBigUpDash/>
        case TaskPriority.MedHi:
            return <ArrowBigUp/>
        case TaskPriority.Medium:
            return <Minus/>
        case TaskPriority.MedLo:
            return <ArrowBigDown/>
        case TaskPriority.Low:
            return <ArrowBigDownDash/>
        default: // Exception
            return <CircleHelp/>
    }
}

function TaskPriorityIcon({oTask}: { oTask: OdaPmTask }): React.JSX.Element {
    const db = OdaPmDbProvider.get();
    const plugin = useContext(PluginContext);
    const priorityTags = db?.pmPriorityTags ?? [];
    const pri = oTask.getPriority(db?.pmPriorityTags)
    return <HoveringPopup hoveredContent={
        <ClickableView icon={getPriorityIcon(pri)}/>
    } popupContent={<div>
        <HStack>
            {
                priorityTags.map((priTag: string, i) => {
                    const priorityIcon = getPriorityIcon(i);
                    return <div key={priTag}>
                        <ClickableView icon={priorityIcon} onIconClicked={() => {
                            setTaskPriority(oTask.boundTask, plugin, priorityTags, priTag);
                        }}/>
                    </div>;
                })
            }

        </HStack>
        <label>
            Customize priority tags in settings.
        </label>
    </div>} title={"Choose priority..."}/>;
}

function PaginatedTaskTable({ curWfName, headers, taskRows, setSortToColumn, headStyleGetter, cellStyleGetter, taskData, onRowContextMenu, onSelectionChange, onSelectionModeChange, clearSelectionTrigger, selectedRowIndices, tableStyle, columnWidths, onColumnResize, onColumnResizeEnd }: {
    curWfName: string,
    headers: React.JSX.Element[],
    taskRows: IRenderable[][],
    setSortToColumn: (index: number) => void,
    headStyleGetter: (columnIndex: number) => React.CSSProperties,
    cellStyleGetter: (column: number, row: number) => React.CSSProperties,
    taskData?: OdaPmTask[],
    onRowContextMenu?: (rowIndex: number, event: React.MouseEvent) => void,
    onSelectionChange?: (selectedRowIndices: number[]) => void,
    onSelectionModeChange?: (isSelectionMode: boolean) => void,
    clearSelectionTrigger?: number,
    selectedRowIndices?: number[],
    tableStyle?: React.CSSProperties,
    columnWidths?: number[],
    onColumnResize?: (columnIndex: number, widthPx: number) => void,
    onColumnResizeEnd?: () => void,
}) {
    const [tasksPerPage, setTasksPerPage,] = usePluginSettings<number>("display_tasks_count_per_page");
    const [maxPageButtonCount] = usePluginSettings<number>("max_page_buttons_count");
    
    // Handle selection changes from DataTable - call callback directly
    const handleSelectionChange = useCallback((selectedRowIndices: number[]) => {
        onSelectionChange?.(selectedRowIndices);
    }, [onSelectionChange]);

    // Handle selection mode changes - clear selection when exiting mode
    const handleSelectionModeChange = useCallback((isSelectionMode: boolean) => {
        onSelectionModeChange?.(isSelectionMode);
        if (!isSelectionMode) {
            // Clear selection when exiting selection mode
            onSelectionChange?.([]);
        }
    }, [onSelectionChange, onSelectionModeChange]);

    return (
        <PaginatedDataTable
            tableTitle={curWfName}
            headers={headers}
            rows={taskRows}
            onHeaderClicked={(arg0) => {
                if (arg0 !== 0) setSortToColumn(arg0);
            }}
            thStyleGetter={headStyleGetter}
            cellStyleGetter={cellStyleGetter}
            dataCountPerPage={tasksPerPage}
            setDataCountPerPage={setTasksPerPage}
            maxPageButtonCount={maxPageButtonCount}
            rowData={taskData}
            onRowContextMenu={onRowContextMenu}
            enableSelectionMode={true}
            onSelectionChange={handleSelectionChange}
            onSelectionModeChange={handleSelectionModeChange}
            clearSelectionTrigger={clearSelectionTrigger}
            selectedRowIndices={selectedRowIndices}
            tableStyle={tableStyle}
            columnWidths={columnWidths}
            onColumnResize={onColumnResize}
            onColumnResizeEnd={onColumnResizeEnd}
        />
    );
}

export function TaskTableView({displayWorkflows, filteredTasks, alwaysShowCompleted}: {
    displayWorkflows: I_OdaPmWorkflow[],
    filteredTasks: OdaPmTask[],
    alwaysShowCompleted?: boolean // if true, always show completed.
}) {
    const plugin = useContext(PluginContext);
    const [searchText, setSearchText] = useState("");
    // sort
    const [columnSort, setColumnSort] = useState<TableSortData>({
        sortBy: getSettings()?.cached_table_task_sorting_by as TableSortBy,
        method: getSettings()?.cached_table_task_sorting_method as TableSortMethod
    })
    // show completed
    const [showCompleted, setShowCompleted] = useState(getSettings()?.show_completed_tasks as boolean);
    const [showSteps, setShowSteps] = useState(getSettings()?.table_steps_shown as boolean);
    const [showTagsInSummary] = usePluginSettings<boolean>("tags_in_task_table_summary_cell");
    // context menu
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, tasks: OdaPmTask[]} | null>(null);
    // track selection mode state to disable interactions
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    // trigger to clear DataTable selection
    const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0);
    // column widths for task table (persisted in settings)
    const [savedColumnWidths, setSavedColumnWidths] = usePluginSettings<number[]>("task_table_column_widths");
    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const columnWidthsRef = useRef<number[]>([]);

    function onJumpToTask(oTask: OdaPmTask) {
        setSearchText(oTask.summary)
        // temporarily set show completed according to the task
        setShowCompleted(oTask.isMdCompleted())
    }

    function onJumpToWorkflow() {
        // clear search text 
        setSearchText("")
        // restore show completed in settings
        setShowCompleted(getSettings()?.show_completed_tasks as boolean)
    }

    useEffect(() => {
        const eventCenter = plugin?.getEmitter()
        eventCenter?.addListener(Evt_JumpTask, onJumpToTask)
        eventCenter?.addListener(Evt_JumpWorkflow, onJumpToWorkflow)
        return () => {
            eventCenter?.removeListener(Evt_JumpTask, onJumpToTask)
            eventCenter?.removeListener(Evt_JumpWorkflow, onJumpToWorkflow)
        }
    });
    const displayedTasks = filteredTasks
        .filter(function (k: OdaPmTask) {
            return alwaysShowCompleted || (showCompleted || !k.isMdCompleted());
        }).filter(function (k: OdaPmTask) { // search string
            return isStringNullOrEmpty(searchText) ? true : simpleFilter(searchText, k);
        })


    // Union
    const displayStepNames = displayWorkflows.map(wf => wf.stepsDef.map(function (k: I_OdaPmStep) {
        return k.name;
    })).flatMap(k => k).unique();
    const displayStepTags = displayWorkflows.map(wf => wf.stepsDef.map(function (k: I_OdaPmStep) {
        return k.tag;
    })).flatMap(k => k).unique();

    // region sort

    switch (columnSort.sortBy) {
        case TableSortBy.Name: {
            const nameSortMethod = columnSort.method;
            const ascending = nameSortMethod === TableSortMethod.Ascending;
            if (nameSortMethod !== TableSortMethod.Appearance) {
                displayedTasks.sort(
                    function (a: OdaPmTask, b: OdaPmTask) {
                        // Case-insensitive compare string 
                        // a-b = ascending
                        if (ascending)
                            return a.summary.localeCompare(b.summary)
                        else return b.summary.localeCompare(a.summary)
                    }
                )
            }
        }
            break;
        case TableSortBy.Step: {
            const stepSortMethod = columnSort.method;
            if (stepSortMethod !== TableSortMethod.Appearance) {
                const stepAscending = stepSortMethod === TableSortMethod.Ascending;
                // column 0 is name, so we -1 to get the step name
                const sortStepTag = columnSort.column ? displayStepTags[columnSort.column - 1] : undefined;
                const stepName = columnSort.column ? displayStepNames[columnSort.column - 1] : undefined;
                if (sortStepTag) {
                    displayedTasks.sort(
                        function (a: OdaPmTask, b: OdaPmTask) {
                            // if ascending, we put the task with this step at the front
                            const aTickStep = a.tickedSteps.find(k => k.name === stepName) ? 0 : 10;
                            const bTickStep = b.tickedSteps.find(k => k.name === stepName) ? 0 : 10;
                            // console.log(stepName, "aTickStep", a.summary, a.tickedSteps, aTickStep, "bTickStep", b.summary, b.tickedSteps, bTickStep,)
                            const mul = stepAscending ? 1 : -1;
                            // if this workflow does not have this step, we put it at the end (always)
                            const aHasStep = (a.type.includesStepTag(sortStepTag) ? 0 : 100) * mul;
                            const bHasStep = (b.type.includesStepTag(sortStepTag) ? 0 : 100) * mul;

                            return (aTickStep + aHasStep - bTickStep - bHasStep) * mul;
                        }
                    )
                }
            }
        }
            break
        case TableSortBy.Priority: {
            const prioritySortMethod = columnSort.method;
            const ascending = prioritySortMethod === TableSortMethod.Ascending;
            if (prioritySortMethod !== TableSortMethod.Appearance) {
                const priorityTags = OdaPmDbProvider.get()?.pmPriorityTags;
                displayedTasks.sort(
                    function (a: OdaPmTask, b: OdaPmTask) {
                        const aPriority = a.getPriority(priorityTags);
                        const bPriority = b.getPriority(priorityTags);
                        if (ascending)
                            return aPriority - bPriority
                        else
                            return bPriority - aPriority
                    }
                )
            }
        }
    }

    // endregion

    // Use task selection hook to manage selection state
    const {
        selectedRowIndices,
        getSelectedTasks,
        handleSelectionChange,
        clearSelection,
    } = useTaskSelection(displayedTasks);

    const curWfName = "Tasks";
    const headers = [
        <VStack style={centerChildrenVertStyle}>
            <WorkflowOverviewView filteredTasks={filteredTasks}/>
            <div style={centerChildrenVertStyle}>
                <HoveringPopup hoveredContent={
                    <HStack style={centerChildren} spacing={5}>
                        <label>
                            Sort:
                        </label>
                        {getNameSortIcon(columnSort)}
                    </HStack>
                }
                               title={"Sort by..."}
                               popupContent={<VStack spacing={5}>
                                   <HStack>
                                       <label>Name</label>
                                       <ClickableView onIconClicked={setSortToName}
                                                      icon={<UpAZ/>}/>
                                   </HStack>
                                   <HStack>
                                       <label>Priority</label>
                                       <ClickableView onIconClicked={setSortToPriority}
                                                      icon={<ArrowBigUpDash/>}/>
                                   </HStack>
                               </VStack>}
                />

            </div>
        </VStack>
        , ...(getSettings()?.table_steps_shown ? displayStepNames.map(
            (k, index) => <div key={k + index}>
                <div>
                    {k}
                </div>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <label>({displayedTasks.filter((m: OdaPmTask) => m.hasStepName(k)).length})</label>
                    {
                        columnSort.sortBy === TableSortBy.Step && columnSort.column === index + 1 ?
                            getStepSortIcon(columnSort.method)
                            : getStepSortIcon(TableSortMethod.Appearance)
                    }
                </div>
            </div>
        ) : [])];

    const columnCount = headers.length;
    useEffect(() => {
        setColumnWidths(prev => padColumnWidths(savedColumnWidths ?? [300], columnCount));
    }, [savedColumnWidths, columnCount]);
    columnWidthsRef.current = columnWidths;
    const effectiveColumnWidths = columnWidths.length === columnCount ? columnWidths : padColumnWidths(savedColumnWidths ?? [300], columnCount);

    const taskRows = displayedTasks.map(function (oTask: OdaPmTask) {
        const row = odaTaskToTableRow(displayStepTags, oTask)
        // console.log(`${oTask.boundTask.text.split(" ").first()}. Md: ${oTask.isMdCompleted()}. Step: ${oTask.stepCompleted()}.`)
        rectifyOdaTaskOnMdTaskChanged(oTask, plugin);

        const summaryWithTag = showTagsInSummary ? addTagToSummary(oTask, row[0]) : row[0];
        row[0] = (
            <OdaTaskSummaryCell 
                key={`${oTask.boundTask.path}:${oTask.boundTask.line}`} 
                oTask={oTask}
                taskFirstColumn={summaryWithTag}
                disableInteractions={isSelectionMode}
            />
        )
        return row
    });

    const { cellStyleGetter, headStyleGetter } = getDefaultTableStyleGetters(effectiveColumnWidths);
    const { tableContainerStyle, tableElementStyle } = getTaskTableLayoutStyles();
    const tableStyleWithLayout = { ...tableElementStyle, tableLayout: "fixed" as const };

    // Handle selection mode changes - clear selection when exiting mode
    // Must be defined at component top level (hooks rule)
    const handleTableSelectionModeChange = useCallback((isMode: boolean) => {
        setIsSelectionMode(isMode);
        // Clear selected UUIDs when exiting selection mode
        if (!isMode) {
            clearSelection();
        }
    }, [clearSelection]);

    const handleColumnResize = useCallback((columnIndex: number, widthPx: number) => {
        setColumnWidths(prev => {
            const n = [...prev];
            const maxW = columnIndex === SUMMARY_COLUMN_INDEX ? MAX_SUMMARY_WIDTH : MAX_STEP_COLUMN_WIDTH;
            const clamped = Math.min(maxW, Math.max(MIN_COLUMN_WIDTH, widthPx));
            n[columnIndex] = clamped;
            return n;
        });
    }, []);
    const handleColumnResizeEnd = useCallback(() => {
        setSavedColumnWidths(columnWidthsRef.current);
    }, [setSavedColumnWidths]);

    function handleRowContextMenu(rowIndex: number, event: React.MouseEvent) {
        const selectedTasks = [displayedTasks[rowIndex]];
        devLog("handleRowContextMenu", rowIndex, event.clientX, event.clientY)
        // clientX and Y are relative to the browser window, not the element
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            tasks: selectedTasks
        });
    }

    function capitalizeWords(text: string): string {
        return text.split(' ').map(word => {
            if (word.length === 0) return word;
            return word[0].toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }

    async function copyTaskNames(tasks: OdaPmTask[], format: 'original' | 'capitalized' | 'withoutTags') {
        let textToCopy = '';
        for (const task of tasks) {
            let taskName = '';
            switch (format) {
                case 'original':
                    taskName = task.summary;
                    break;
                case 'capitalized':
                    taskName = capitalizeWords(task.summary);
                    break;
                case 'withoutTags':
                    taskName = task.summary; // summary already doesn't include tags
                    break;
            }
            textToCopy += taskName + '\n';
        }
        textToCopy = textToCopy.trim(); // Remove trailing newline
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            notify(`Copied ${tasks.length} task name(s)`, 2);
        } catch (err) {
            devLog('Failed to copy:', err);
            notify('Failed to copy task names', 2);
        }
    }

    // Batch operations for selected tasks
    function handleBatchChangeWorkflow(tasks: OdaPmTask[]) {
        if (tasks.length === 0) return;
        
        try {
            // Use the first task's project to filter workflows
            const firstTask = tasks[0];
            
            new WorkflowSuggestionModal(plugin.app, firstTask.boundTask.path, firstTask, async (workflow, evt) => {
                if (!workflow) return;
                
                try {
                    const result = await batchChangeWorkflow(tasks, workflow, plugin.app.vault);
                    notifyBatchOperationResult('Changed workflow', tasks.length, result);
                } catch (error) {
                    devLog('Error in batch change workflow:', error);
                    notify('Failed to change workflow for selected tasks', 3);
                }
            }).open();
        } catch (error) {
            devLog('Error opening workflow suggestion modal:', error);
            notify('Failed to open workflow selection', 3);
        }
    }

    function handleBatchSetPriority(tasks: OdaPmTask[]) {
        if (tasks.length === 0) return;
        
        try {
            const priorityTags = OdaPmDbProvider.get()?.pmPriorityTags ?? [];
            if (priorityTags.length === 0) {
                notify('No priority tags configured', 3);
                return;
            }
            
            new PrioritySuggestionModal(plugin.app, async (priorityTag, evt) => {
                try {
                    const result = await batchSetPriority(tasks, priorityTag, plugin, priorityTags);
                    notifyBatchOperationResult('Set priority', tasks.length, result);
                } catch (error) {
                    devLog('Error in batch set priority:', error);
                    notify('Failed to set priority for selected tasks', 3);
                }
            }).open();
        } catch (error) {
            devLog('Error opening priority suggestion modal:', error);
            notify('Failed to open priority selection', 3);
        }
    }

    const contextMenuItems: ContextMenuItem[] = contextMenu ? [
        {
            label: 'Copy Task Names (Original)',
            onClick: () => copyTaskNames(contextMenu.tasks, 'original')
        },
        {
            label: 'Copy Task Names (Capitalized)',
            onClick: () => copyTaskNames(contextMenu.tasks, 'capitalized')
        },
        {
            label: 'Copy Task Names (Without tags)',
            onClick: () => copyTaskNames(contextMenu.tasks, 'withoutTags')
        },
        ...(contextMenu.tasks.length > 0 ? [
            {
                label: `Change Workflow (${contextMenu.tasks.length} task${contextMenu.tasks.length > 1 ? 's' : ''})`,
                onClick: () => handleBatchChangeWorkflow(contextMenu.tasks)
            },
            {
                label: `Set Priority (${contextMenu.tasks.length} task${contextMenu.tasks.length > 1 ? 's' : ''})`,
                onClick: () => handleBatchSetPriority(contextMenu.tasks)
            }
        ] : [])
    ] : [];

    const toolbarStyle: React.CSSProperties = {
        ...filterCardStyle,
        gap: 12,
        marginBottom: 0, // override filterCardStyle's marginBottom
    };
    const searchWrapStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        flex: "1 1 200px",
        minWidth: 180,
        maxWidth: 320,
    };
    const taskSearchInputStyle: React.CSSProperties = {
        ...filterInputStyle,
        width: "100%",
    };

    return (
        <VStack spacing={diffGroupSpacing}>
            <HStack style={{ ...centerChildren, ...toolbarStyle }} spacing={10}>
                <span style={searchWrapStyle}>
                    <input
                        style={taskSearchInputStyle}
                        type="text"
                        value={searchText}
                        placeholder="Search task name..."
                        onChange={(evt) => setSearchText(evt.target.value)}
                    />
                    <ClickableObsidianIconView
                        style={{ marginLeft: -28, paddingTop: 5 }}
                        onIconClicked={() => setSearchText("")}
                        iconName="x-circle"
                    />
                </span>
                <ExternalControlledCheckbox
                    content="Show Completed"
                    onChange={handleShowCompletedChange}
                    externalControl={showCompleted}
                    onContentClicked={handleShowCompletedChange}
                />
                <ExternalControlledCheckbox
                    content="Show Steps"
                    onChange={handleShowStepsChange}
                    onContentClicked={handleShowStepsChange}
                    externalControl={showSteps}
                />
            </HStack>

            {displayWorkflows.length === 0 ? (
                <label>No Workflow selected.</label>
            ) : taskRows.length > 0 ? (
                <>
                    <TaskSelectionToolbar
                        selectedTasks={getSelectedTasks()}
                        selectedCount={selectedRowIndices.length}
                        plugin={plugin}
                        onClearSelection={() => {
                            clearSelection();
                            setClearSelectionTrigger(prev => prev + 1);
                        }}
                        visible={isSelectionMode}
                    />
                    <div style={tableContainerStyle}>
                        <SelectionModeContext.Provider value={isSelectionMode}>
                            <PaginatedTaskTable
                                curWfName={curWfName}
                                headers={headers}
                                taskRows={taskRows}
                                setSortToColumn={setSortToColumn}
                                headStyleGetter={headStyleGetter}
                                cellStyleGetter={cellStyleGetter}
                                taskData={displayedTasks}
                                onRowContextMenu={handleRowContextMenu}
                                onSelectionChange={handleSelectionChange}
                                onSelectionModeChange={handleTableSelectionModeChange}
                                clearSelectionTrigger={clearSelectionTrigger}
                                selectedRowIndices={selectedRowIndices}
                                tableStyle={tableStyleWithLayout}
                                columnWidths={effectiveColumnWidths}
                                onColumnResize={columnWidths.length === columnCount ? handleColumnResize : undefined}
                                onColumnResizeEnd={columnWidths.length === columnCount ? handleColumnResizeEnd : undefined}
                            />
                        </SelectionModeContext.Provider>
                    </div>
                    {contextMenu && (
                        <ContextMenu
                            items={contextMenuItems}
                            x={contextMenu.x}
                            y={contextMenu.y}
                            onClose={() => setContextMenu(null)}
                        />
                    )}
                </>
            ) : (
                <div style={{ padding: "12px 14px", color: "var(--text-muted)" }}>
                    <label>No results.</label>
                </div>
            )}
        </VStack>
    );

    //region sort method
    function setSortToName() {
        const prevMethod = columnSort.sortBy;
        // Loop
        const nextSortMethod = loopIndex(columnSort.method + 1, totalSortMethods);
        setColumnSort({
            sortBy: TableSortBy.Name,
            column: undefined,
            method: prevMethod === TableSortBy.Name ? nextSortMethod : TableSortMethod.Ascending
        })
        setSettingsValueAndSave(plugin, "cached_table_task_sorting_by", TableSortBy.Name)
        setSettingsValueAndSave(plugin, "cached_table_task_sorting_method", nextSortMethod)
    }

    function setSortToPriority() {
        const prevMethod = columnSort.sortBy;
        const nextSortMethod = loopIndex(columnSort.method + 1, totalSortMethods);
        setColumnSort({
            sortBy: TableSortBy.Priority,
            column: undefined,
            method: prevMethod === TableSortBy.Priority ? nextSortMethod : TableSortMethod.Ascending
        })

        setSettingsValueAndSave(plugin, "cached_table_task_sorting_by", TableSortBy.Priority)
        setSettingsValueAndSave(plugin, "cached_table_task_sorting_method", nextSortMethod)
    }

    function setSortToColumn(index: number) {
        const prevMethod = columnSort.sortBy;
        // if name: ascending, else: loop int
        setColumnSort({
            sortBy: TableSortBy.Step,
            column: index,
            method: prevMethod === TableSortBy.Name || columnSort.column !== index
                ? TableSortMethod.Ascending : loopIndex(columnSort.method + 1, totalSortMethods)
        })
        resetNameSortMethod()
    }

    function resetNameSortMethod() {
        setSettingsValueAndSave(plugin, "cached_table_task_sorting_by", TableSortBy.Name)
        setSettingsValueAndSave(plugin, "cached_table_task_sorting_method", TableSortMethod.Appearance)
    }

    //endregion

    // region Show columns
    function handleShowCompletedChange() {
        const nextChecked = !showCompleted;
        setShowCompleted(nextChecked)
        setSettingsValueAndSave(plugin, "show_completed_tasks", nextChecked)
    }

    function handleShowStepsChange() {
        const nextChecked = !showSteps;
        setShowSteps(nextChecked)
        setSettingsValueAndSave(plugin, "table_steps_shown", nextChecked)
    }

    // endregion

}

//  region Custom View
function WorkflowOverviewView({filteredTasks}: {
    filteredTasks: DataArray<OdaPmTask>
}) {
    const totalCount = filteredTasks.length;
    const completedTasks = filteredTasks.filter(function (k: OdaPmTask) {
        return k.isMdCompleted();
    });
    const completedCount = completedTasks.length;
    const completeRatio = completedCount / totalCount;
    const ratioString = totalCount === 0 ? "100" : (completeRatio * 100).toFixed(2);
    if (totalCount === 0)
        return <></>

    let color = null
    if (!isNaN(completeRatio)) {
        if (completeRatio >= 0.8)
            color = "green"
        else if (completeRatio >= 0.5)
            color = "orange"
    }
    const labelColorStype = isStringNullOrEmpty(color) ? {} : {color: color} as React.CSSProperties;
    return (<>
            <label style={labelColorStype}>{completedCount}/{totalCount} tasks
                completed: {ratioString}%.</label>
        </>
    )
}

function tickStepCheckbox(includes: boolean, oTask: OdaPmTask, stepTag: string, plugin: OdaPmToolPlugin) {
    // preserve the status, but add or remove the step tag
    const nextChecked = !includes;
    const nextCompleted = oTask.lackOnlyOneStep(stepTag);
    switch (oTask.type.type) {
        case "chain": {
            // State: unticked. Behaviour: tick step. Outcome: if completion, tick summary. (same), remove all but this step (diff).
            const next_text = !nextChecked ? oTask.removeAllStepTags() : oTask.keepOneStepTag(stepTag);
            const nextStatus = (nextCompleted && nextChecked) ? TaskStatus_checked : TaskStatus_unchecked;
            rewriteTask(
                plugin.app.vault, oTask.boundTask, nextStatus, next_text
            )
        }
            break;
        case "checkbox": { // use curly braces to avoid scope conflict
            // remove the tag when untick the checkbox, or add the tag when tick the checkbox
            const next_text = !nextChecked ?
                oTask.removeStepTagText(stepTag) :
                oTask.addStepTagText(stepTag)

            const fromTickedToUnticked = oTask.stepCompleted() && !nextChecked; // State: all ticked. Behaviour: untick step. Outcome: untick the summary.
            const nextStatus = fromTickedToUnticked ? TaskStatus_unchecked : (
                    nextCompleted ? TaskStatus_checked //  State: unticked. Behaviour: tick step. Outcome: if all steps are ticked, tick the summary.
                        : oTask.boundTask.status
                )
            ;

            rewriteTask(plugin.app.vault, oTask.boundTask,
                nextStatus, next_text)
            break;
        }

    }
}

function OdaPmStepCell({ oTask, stepTag, style }: {
    oTask: OdaPmTask,
    stepTag: string
} & I_Stylable) {
    const plugin = useContext(PluginContext);
    const disableInteractions = useContext(SelectionModeContext);
    if (!oTask.type.stepsDef.map(k => k.tag).includes(stepTag))
        return <></>;
    const includes = oTask.tickedSteps.map(k => k.tag).includes(stepTag);

    function tickStep() {
        if (disableInteractions) return;
        tickStepCheckbox(includes, oTask, stepTag, plugin);
    }

    return (
        <ExternalControlledCheckbox
            style={stepCellCheckboxStyle}
            key={oTask.text + stepTag}
            externalControl={includes}
            onChange={tickStep}
        />
    );
}

// For checkbox
function odaWorkflowToTableCells(displayStepTags: string[], oTask: OdaPmTask) {
    return [...displayStepTags.map((stepTag: string) => {
        return <OdaPmStepCell key={stepTag} oTask={oTask} stepTag={stepTag}/>
    })]
}

// For checkbox  
function addTagToSummary(oTask: OdaPmTask, summary: string) {
    for (const tag of oTask.getAllTags()) {

        const hidden = shouldTagBeHidden(tag);
        // devLog(tag, "Hidden?", hidden)

        if (!hidden) {
            summary = addTagText(summary, tag)
        }
    }
    return summary;
}

// region Workflow Ui wrapper
function odaTaskToTableRow(displayStepTags: string[], oTask: OdaPmTask): IRenderable[] {

    return [oTask.summary, ...(getSettings()?.table_steps_shown ? odaWorkflowToTableCells(displayStepTags, oTask) : [])];
}


/**
 * Tag_Prefix_Tag is not included.
 * @param tag
 */
function shouldTagBeHidden(tag: string) {
    const lowerTag = tag.toLowerCase();
    const startsWith = lowerTag.startsWith(Tag_Prefix_Project)
        || lowerTag.startsWith(Tag_Prefix_Workflow)
        || lowerTag.startsWith(Tag_Prefix_Step)
        || lowerTag.startsWith(Tag_Prefix_TaskType);
    if (startsWith)
        return startsWith;

    const db = OdaPmDbProvider.get();
    const priorityTags = db?.pmPriorityTags || [];
    // remove priority tags
    for (const priorityTag of priorityTags) {
        if (tag == priorityTag)
            return true
    }
    return false;
}

// endregion

// endregion
 
