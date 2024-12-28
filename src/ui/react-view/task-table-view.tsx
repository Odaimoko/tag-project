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
import React, {MouseEvent, ReactElement, useContext, useEffect, useState} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
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
import {DataTable} from "../pure-react/view-template/data-table";
import {IRenderable} from "../pure-react/props-typing/i-renderable";
import {DataArray} from "obsidian-dataview";
import {MarkdownRenderer} from "obsidian";
import {HtmlStringComponent} from "../pure-react/view-template/html-string-component";
import {appendBoldText} from "../common/html-template";
import {notify} from "../../utils/o-notice";
import {centerChildren, centerChildrenVertStyle, getStickyHeaderStyle} from "../pure-react/style-def";
import {Minus} from "../pure-react/icon/Minus";
import {DownAZ, UpAZ} from "../pure-react/icon/DownAZ";
import {Down01, Up01} from "../pure-react/icon/Down01";
import {ArrowBigDown, ArrowBigDownDash, ArrowBigUp, ArrowBigUpDash} from "../pure-react/icon/ArrowBigUpDash";
import {OdaPmDbProvider} from "../../data-model/OdaPmDb";
import {HoveringPopup} from "../pure-react/view-template/hovering-popup";
import {CircleHelp} from "../pure-react/icon/CircleHelp";
import {devLog} from "../../utils/env-util";
import {I_Stylable} from "../pure-react/props-typing/i-stylable";
import {loopIndex} from "../pure-react/utils/loop-index";
import {getIconByWorkflow} from "./tag-project-style";
import {ClickableView} from "../pure-react/view-template/clickable-view";
import {addTagText} from "../../data-model/tag-text-manipulate";
import {Tag_Prefix_Project} from "../../data-model/OdaPmProject";

export const taskCheckBoxMargin = {marginLeft: 3};

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
export const OdaTaskSummaryCell = ({oTask, taskFirstColumn, showCheckBox, showPriority, showWorkflowIcon}: {
    oTask: OdaPmTask,
    taskFirstColumn: IRenderable,
    showPriority?: boolean
    showCheckBox?: boolean
    showWorkflowIcon?: boolean
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
            <InternalLinkView content={summaryView} onIconClicked={openThisTask} onContentClicked={openThisTask}/>
        </span>;
    return <HStack style={centerChildren} spacing={5}>
        {showWorkflowIcon ? getIconByTask(oTask) : null}
        {showPriority && <TaskPriorityIcon oTask={oTask}/>}
        {showCheckBox ? <ExternalControlledCheckbox
            content={checkBoxContent}
            onChange={tickSummary}
            onContentClicked={openThisTask}
            externalControl={oTask.stepCompleted()}
        /> : checkBoxContent}

    </HStack>;

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

export function getDefaultTableStyleGetters(minSummaryWidth: number | string = 500, maxSummaryWidth: number | string = 300, summaryColumn = 0, isCellCentered = true) {
    // striped rows. center step cell but not summary cell.
    // TODO performance, we instantiate a lot of dictionaries here
    const evenBg: React.CSSProperties = {backgroundColor: "rgba(0,0,0,0.2)"};
    const oddBg: React.CSSProperties = {};
    const summaryCellStyle: React.CSSProperties = {
        minWidth: minSummaryWidth,
        maxWidth: maxSummaryWidth,
        padding: 5, paddingLeft: 10
    }
    const summaryEvenCellStyle = {...summaryCellStyle, ...evenBg}
    const summaryOddCellStyle = {...summaryCellStyle, ...oddBg}

    const stepCellStyle: React.CSSProperties = {
        textAlign: isCellCentered ? "center" : "inherit",
        padding: 10,
    }
    const stepEvenCellStyle = {...stepCellStyle, ...evenBg}
    const stepOddCellStyle = {...stepCellStyle, ...oddBg}

    function cellStyleGetter(column: number, row: number): React.CSSProperties {
        const even = row % 2 === 0;
        const cellStyle = even ? stepEvenCellStyle : stepOddCellStyle
        const summaryStyle = even ? summaryEvenCellStyle : summaryOddCellStyle
        if (column === summaryColumn) {
            return summaryStyle
        } else return cellStyle
    }

    function headStyleGetter(columnIndex: number): React.CSSProperties {
        const style = {
            ...(getStickyHeaderStyle()),
            padding: 10,
            minWidth: (columnIndex === summaryColumn ? minSummaryWidth : "unset"),
            maxWidth: (columnIndex === summaryColumn ? maxSummaryWidth : "unset")
        };
        // console.log(`thStyleGetter: ${JSON.stringify(style)}`)
        return style as React.CSSProperties;
    }

    return {cellStyleGetter, headStyleGetter};
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

export function TaskTableView({displayWorkflows, filteredTasks}: {
    displayWorkflows: I_OdaPmWorkflow[],
    filteredTasks: OdaPmTask[]
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
    const [showTagsInSummary, setShowTagsInSummary] = usePluginSettings<boolean>("tags_in_task_table_summary_cell");

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
            return (showCompleted || !k.isMdCompleted());
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


    const taskRows = displayedTasks.map(function (oTask: OdaPmTask) {
        const row = odaTaskToTableRow(displayStepTags, oTask)
        // console.log(`${oTask.boundTask.text.split(" ").first()}. Md: ${oTask.isMdCompleted()}. Step: ${oTask.stepCompleted()}.`)
        rectifyOdaTaskOnMdTaskChanged(oTask, plugin);

        const summaryWithTag = showTagsInSummary ? addTagToSummary(oTask, row[0]) : row[0];
        row[0] = (
            <OdaTaskSummaryCell key={`${oTask.boundTask.path}:${oTask.boundTask.line}`} oTask={oTask}
                                taskFirstColumn={summaryWithTag}/>
        )
        return row
    });

    const {cellStyleGetter, headStyleGetter} = getDefaultTableStyleGetters();

    return (
        <>
            <HStack style={{
                justifyContent: "flex-start",
                alignItems: "center"
            }} spacing={10}>
                <span style={{display: "flex", alignItems: "center"}}>
                    <input
                        style={{width: "100%"}}
                        type="text" // You can change the "type" attribute for different input types
                        value={searchText}
                        placeholder={"Search task name..."}
                        onChange={(evt) => {
                            setSearchText(evt.target.value)
                        }}
                    />
                    {/*It seems that the icon's size is 10x10? */}
                    <ClickableObsidianIconView style={{marginLeft: -25, paddingTop: 5}}
                                               onIconClicked={() => {
                                                   setSearchText("")
                                               }} iconName={"x-circle"}/>
                </span>

                <ExternalControlledCheckbox content={"Show Completed"} onChange={handleShowCompletedChange}
                                            externalControl={showCompleted}
                                            onContentClicked={handleShowCompletedChange}/>
                <ExternalControlledCheckbox content={"Show Steps"} onChange={handleShowStepsChange}
                                            onContentClicked={handleShowStepsChange}
                                            externalControl={showSteps}/>
            </HStack>

            <p/>
            {

                displayWorkflows.length === 0 ? <label>No Workflow selected.</label> : (
                    taskRows.length > 0 ? <DataTable
                        tableTitle={curWfName}
                        headers={headers}
                        rows={taskRows}
                        onHeaderClicked={(arg0) => {
                            if (arg0 === 0) {
                                // setSortToName()
                            } else {
                                setSortToColumn(arg0)
                            }
                        }}
                        thStyleGetter={headStyleGetter}
                        cellStyleGetter={cellStyleGetter}
                    /> : <div>
                        <label>No results.</label>
                    </div>
                )
            }
        </>
    )

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

function OdaPmStepCell({oTask, stepTag, style}: {
    oTask: OdaPmTask,
    stepTag: string
} & I_Stylable) {
    const plugin = useContext(PluginContext);
    // TODO performance
    // If this workflow does not need this step, we show nothing.
    if (!oTask.type.stepsDef.map(k => k.tag).includes(stepTag))
        return <></>
    // Otherwise, we show a checkbox showing if current task completes this step.
    const includes = oTask.tickedSteps.map(k => k.tag).includes(stepTag);

    // Automatically  complete the parent task when checking in manage page 
    function tickStep() {
        tickStepCheckbox(includes, oTask, stepTag, plugin);
    }

    return <ExternalControlledCheckbox style={style}
                                       key={oTask.text + stepTag}
                                       externalControl={includes}
                                       onChange={tickStep}
    />

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
        devLog(tag, "Hidden?", hidden)

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
 
