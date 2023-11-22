import {OdaPmTask} from "../../data-model/OdaPmTask";
import OdaPmToolPlugin from "../../main";
import {I_OdaPmStep, I_OdaPmWorkflow, TaskStatus_checked, TaskStatus_unchecked} from "../../data-model/workflow-def";
import {openTaskPrecisely, rewriteTask} from "../../utils/io-util";
import React, {ReactElement, useContext, useEffect, useState} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {
    getSettings,
    setSettingsValueAndSave,
    SortMethod_Appearance,
    SortMethod_Ascending,
    totalSortMethods
} from "../../Settings";
import {Evt_JumpTask, Evt_JumpWorkflow} from "../../typing/dataview-event";
import {initialToUpper, isStringNullOrEmpty, simpleFilter} from "../../utils/format-util";
import {HStack} from "./view-template/h-stack";
import {ClickableIconView, I_Stylable, InternalLinkView} from "./view-template/icon-view";
import {ExternalControlledCheckbox} from "./view-template/checkbox";
import {DataTable} from "./view-template/data-table";
import {IRenderable} from "../common/i-renderable";
import {DataArray} from "obsidian-dataview";
import {MarkdownRenderer} from "obsidian";
import {HtmlStringComponent} from "./view-template/html-string-component";
import {appendBoldText} from "../common/html-template";
import {notify} from "../../utils/o-notice";
import {getIconByWorkflow} from "./style-def";

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
export const OdaTaskSummaryCell = ({oTask, taskFirstColumn, showCheckBox, showWorkflowIcon}: {
    oTask: OdaPmTask,
    taskFirstColumn: IRenderable,
    showCheckBox?: boolean
    showWorkflowIcon?: boolean
}) => {
    showCheckBox = showCheckBox ?? true // backward compatibility
    showWorkflowIcon = showWorkflowIcon ?? true
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
    }, [oTask]);

    const checkBoxContent = <span>
        <InternalLinkView content={summaryView} onIconClicked={openThisTask} onContentClicked={openThisTask}/>
    </span>;
    return <HStack spacing={5}>
        {showWorkflowIcon ? getIconByTask(oTask) : null}
        {showCheckBox ? <ExternalControlledCheckbox
            content={checkBoxContent}
            onChange={tickSummary}
            onLabelClicked={openThisTask}
            externalControl={oTask.stepCompleted()}
        /> : checkBoxContent}

    </HStack>;

    function openThisTask() {
        openTaskPrecisely(workspace, oTask.boundTask);
    }


};

/**
 * in the case that users manipulate the checkbox in markdown, we update the step tags accordingly.
 * @param oTask
 * @param plugin
 */
function rectifyOdaTaskOnMdTaskChanged(oTask: OdaPmTask, plugin: OdaPmToolPlugin) {
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
        if (oTask.currentSteps.length > 1) {

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

    const stepCellStyle: React.CSSProperties = {textAlign: isCellCentered ? "center" : "inherit"}
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
            backgroundColor: "var(--background-primary)",
            position: "sticky", top: -16,
            padding: 10,
            minWidth: (columnIndex === summaryColumn ? minSummaryWidth : "unset"),
            maxWidth: (columnIndex === summaryColumn ? maxSummaryWidth : "unset")
        };
        // console.log(`thStyleGetter: ${JSON.stringify(style)}`)
        return style as React.CSSProperties;
    }

    return {cellStyleGetter, headStyleGetter};
}

export function TaskTableView({displayWorkflows, filteredTasks}: {
    displayWorkflows: I_OdaPmWorkflow[],
    filteredTasks: OdaPmTask[]
}) {
    const plugin = useContext(PluginContext);
    const [searchText, setSearchText] = useState("");
    // sort
    const [sortCode, setSortCode] = useState(getSettings()?.table_column_sorting as number); // 0 = unsorted, 1 = asc, 2 = desc
    const nextSortCode = (sortCode + 1) % totalSortMethods;
    // show completed
    const [showCompleted, setShowCompleted] = useState(getSettings()?.show_completed_tasks as boolean);
    const [showSteps, setShowSteps] = useState(getSettings()?.table_steps_shown as boolean);

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
        }).filter(function (k: OdaPmTask) {
            return isStringNullOrEmpty(searchText) ? true : simpleFilter(searchText, k);
        })

    const ascending = sortCode === SortMethod_Ascending;
    if (sortCode !== SortMethod_Appearance) {
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

    // Union
    const displayStepNames = displayWorkflows.map(wf => wf.stepsDef.map(function (k: I_OdaPmStep) {
        return k.name;
    })).flatMap(k => k).unique();
    const displayStepTags = displayWorkflows.map(wf => wf.stepsDef.map(function (k: I_OdaPmStep) {
        return k.tag;
    })).flatMap(k => k).unique();

    const curWfName = "Tasks";// displayWorkflows.map(k => k.name).join(", ")
    const headers = [
        <WorkflowOverviewView filteredTasks={filteredTasks}/>
        , ...(getSettings()?.table_steps_shown ? displayStepNames.map(
            (k) => `${k} (${displayedTasks.filter((m: OdaPmTask) => m.hasStepName(k)).length})`
        ) : [])];


    const taskRows = displayedTasks.map(function (oTask: OdaPmTask) {
        const row = odaTaskToTableRow(displayStepTags, oTask)
        // console.log(`${oTask.boundTask.text.split(" ").first()}. Md: ${oTask.isMdCompleted()}. Step: ${oTask.stepCompleted()}.`)
        rectifyOdaTaskOnMdTaskChanged(oTask, plugin);
        row[0] = (
            <OdaTaskSummaryCell key={`${oTask.boundTask.path}:${oTask.boundTask.line}`} oTask={oTask}
                                taskFirstColumn={row[0]}/>
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
                    <ClickableIconView style={{marginLeft: -25, paddingTop: 5}}
                                       onIconClicked={() => {
                                           setSearchText("")
                                       }} iconName={"x-circle"}/>
                </span>
                <HStack style={{alignItems: "center"}} spacing={4}>
                    <label> Sort </label>
                    <button onClick={
                        () => {
                            // Loop
                            setSortCode(nextSortCode)
                            setSettingsValueAndSave(plugin, "table_column_sorting", nextSortCode)
                        }
                    }
                    >
                        {sortCode === SortMethod_Appearance ? "By Appearance" : ascending ? "Ascending" : "Descending"}
                    </button>
                </HStack>
            </HStack>
            <p/>
            <HStack spacing={10}>
                <ExternalControlledCheckbox content={"Show Completed"} onChange={handleShowCompletedChange}
                                            externalControl={showCompleted} onLabelClicked={handleShowCompletedChange}/>
                <ExternalControlledCheckbox content={"Show Steps"} onChange={handleShowStepsChange}
                                            onLabelClicked={handleShowStepsChange}
                                            externalControl={showSteps}/>
            </HStack>
            <p/>
            {
                // -16 is the padding of the obsidian leaf view container. The content will overflow the container's box.
                // sticky header see: https://css-tricks.com/position-sticky-and-table-headers/
                displayWorkflows.length === 0 ? <label>No Workflow selected.</label> : (
                    taskRows.length > 0 ? <DataTable
                        tableTitle={curWfName}
                        headers={headers}
                        rows={taskRows}

                        thStyleGetter={headStyleGetter}
                        cellStyleGetter={cellStyleGetter}
                    /> : <label>No results.</label>
                )
            }
        </>
    )


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
                oTask.removeStepTag(stepTag) :
                oTask.addStepTag(stepTag)

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
    const includes = oTask.currentSteps.map(k => k.tag).includes(stepTag);

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
// region Workflow Ui wrapper
function odaTaskToTableRow(displayStepTags: string[], oTask: OdaPmTask): IRenderable[] {

    return [`${oTask.summary}`, ...(getSettings()?.table_steps_shown ? odaWorkflowToTableCells(displayStepTags, oTask) : [])];
}

// endregion

// endregion
 
