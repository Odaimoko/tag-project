import {
    I_OdaPmStep,
    I_OdaPmWorkflow,
    OdaPmTask,
    Tag_Prefix_Tag,
    TaskStatus_checked,
    TaskStatus_unchecked,
    Workflow_Type_Enum_Array,
    WorkflowType
} from "../data-model/workflow_def";
import {DataArray, STask} from "obsidian-dataview";
import {Workspace} from "obsidian";
import React, {useContext, useEffect, useState} from "react";
import {I_Renderable} from "./i_Renderable";

import {rewriteTask} from "../utils/io_util";
import {ContainerContext, PluginContext} from "./manage-page-view";
import {EventEmitter} from "events";
import OdaPmToolPlugin from "../main";
import {notify} from "../utils/o-notice";

import {initialToUpper, isStringNullOrEmpty, simpleFilter} from "../utils/format_util";
import {
    FilterMethod_Excluded,
    FilterMethod_Included,
    FilterMethod_NotFiltering,
    getNextFilterMethod,
    getSettings,
    setSettingsValueAndSave,
    SortMethod_Appearance,
    SortMethod_Ascending,
    totalSortMethods
} from "../Settings";
import {
    ClickableIconView,
    DataTable,
    ExternalControlledCheckbox,
    HStack,
    I_Stylable,
    InternalLinkView,
    ObsidianIconView
} from "./view-template";
import {appendBoldText} from "./html-template";
import {OdaPmDbProvider} from "../data-model/odaPmDb";
import {iPm_DbReloaded, iPm_JumpTask, iPm_JumpWorkflow} from "../typing/dataview-event";


// dark light compatible
export const Color_WorkflowChain = "#6289bb"
export const Color_Workflow_Checkbox = "#5eb95f"

const iconViewAsAWholeStyle = {display: "inline-flex", justifyItems: "center"};

function getColorByWorkflow(type: I_OdaPmWorkflow) {
    switch (type.type) {
        case "chain":
            return Color_WorkflowChain;
        case "checkbox" :
            return Color_Workflow_Checkbox;
    }
    return "currentColor"
}


function notifyTask(oTask: OdaPmTask, reason: string) {
    const doc = new DocumentFragment();
    appendBoldText(doc, reason);
    doc.appendText("\n")
    doc.appendText(oTask.summary)
    notify(doc, 4)
}


// if we use workspace.openLinkText, a task without a block id will be opened with its section
function openTaskPrecisely(workspace: Workspace, task: STask) {
    // Copy from dataview. See TaskItem.
    workspace.openLinkText(
        task.link.toFile().obsidianLink(),
        task.path,
        false,
        {
            eState: {
                cursor: {
                    from: {line: task.line, ch: task.position.start.col},
                    to: {line: task.line + task.lineCount - 1, ch: task.position.end.col},
                },
                line: task.line,
            },
        }
    );
}


export function ReactManagePage({eventCenter}: {
    eventCenter?: EventEmitter
}) {
    // only for re-render
    const [rerenderState, setRerenderState] = useState(0);

    function triggerRerender() {
        // console.log(`ReactManagePage rerender triggered. ${rerenderState + 1}`)
        setRerenderState((prevState) => prevState + 1)
    }

    function jumpTask(oTask: OdaPmTask) {
        jumpWf(oTask.type)
    }

    function jumpWf(wf: I_OdaPmWorkflow) {
        setDisplayWorkflowNames([wf.name])
        setDisplayTags([])
    }

    // How to prevent add listener multiple times? use custom emitter instead of obsidian's event emitter
    useEffect(() => {
        eventCenter?.addListener(iPm_DbReloaded, triggerRerender)
        eventCenter?.addListener(iPm_JumpTask, jumpTask)
        eventCenter?.addListener(iPm_JumpWorkflow, jumpWf)
        return () => {
            eventCenter?.removeListener(iPm_DbReloaded, triggerRerender)
            eventCenter?.removeListener(iPm_JumpTask, jumpTask)
            eventCenter?.removeListener(iPm_JumpWorkflow, jumpWf)

        }
    }, [rerenderState]);

    const plugin = useContext(PluginContext);

    const db = OdaPmDbProvider.get();
    const workflows = db?.workflows || [];

    // Use workflow names as filters' state instead. previously we use workflows themselves as state, but this requires dataview to be initialized.
    // However, this component might render before dataview is ready. The partially ready workflows will be used as the initial value, which is incorrect.
    // This is to fix the bug: On open Obsidian, the filter may not work.
    const [displayWorkflowNames, setDisplayWorkflowNames] = useState(getSettings()?.display_workflow_names as string[]);
    const [displayTags, setDisplayTags] = useState(getSettings()?.manage_page_display_tags as string[]);
    const [excludedTags, setExcludedTags] = useState(getSettings()?.manage_page_excluded_tags as string[]);

    function handleSetDisplayWorkflows(names: string[]) {
        setSettingsValueAndSave(plugin, "display_workflow_names", [...names]) // TODO mem leak?
        setDisplayWorkflowNames(names)
    }

    function handleSetDisplayTags(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_display_tags", [...names])
        setDisplayTags(names)
    }

    function handleSetExcludedTags(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_excluded_tags", [...names])
        setExcludedTags(names)
    }

    const rectifiedDisplayTags = displayTags.filter(k => db?.pmTags.contains(k))
    const rectifiedExcludedTags = excludedTags.filter(k => db?.pmTags.contains(k))

    // place all hooks before return. React doesn't allow the order to be changed.
    if (workflows.length === 0 || db === null)
        return <EmptyWorkflowView/>

    const displayWorkflows = workflows.filter(k => {
        return displayWorkflowNames.includes(k.name);
    });

    // Here we use reference equality to filter tasks. Using reference is prone to bugs since we tend to new a lot in js, but using string id is memory consuming. Trade-off.
    const filteredTasks: DataArray<OdaPmTask> = db.pmTasks.filter(function (k: OdaPmTask) {
        return displayWorkflows.includes(k.type);
    })
        .filter(function (k: OdaPmTask) {
            // No tag chosen: show all tasks
            // Some tags chosen: combination or.
            return rectifiedDisplayTags.length === 0 ? true : k.hasAnyTag(rectifiedDisplayTags);
        }).filter(function (k: OdaPmTask) {
            // No tag chosen: show all tasks
            // Some tags chosen: combination or.
            return rectifiedExcludedTags.length === 0 ? true : !k.hasAnyTag(rectifiedExcludedTags);
        });

    // console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${filteredTasks.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)

    const pmTags = db.pmTags || [];
    return (
        <>

            <WorkflowFilterHeading workflows={workflows} displayWorkflowNames={displayWorkflowNames}
                                   handleSetDisplayWorkflows={handleSetDisplayWorkflows}/>
            <div>
                {workflows.map((workflow: I_OdaPmWorkflow) => {
                    return (
                        <WorkflowFilterCheckbox key={workflow.name} displayWorkflows={displayWorkflowNames}
                                                workflow={workflow}
                                                setDisplayWorkflows={handleSetDisplayWorkflows}/>
                    )
                })}
            </div>
            {pmTags.length > 0 ?
                <HStack style={{alignItems: "center"}} spacing={10}>
                    <h3>{rectifiedDisplayTags.length}/{pmTags.length} Tags(s)</h3>
                    <button onClick={() => {
                        handleSetDisplayTags([...pmTags]);
                        handleSetExcludedTags([])
                    }}>Include All
                    </button>
                    <button onClick={() => {
                        handleSetDisplayTags([]);
                        handleSetExcludedTags([...pmTags])
                    }}>Exclude All
                    </button>
                    <button onClick={() => {
                        handleSetDisplayTags([]);
                        handleSetExcludedTags([])
                    }}>Clear
                    </button>
                </HStack>
                : null}
            <div>
                {pmTags.map((tag: string) => {
                    return <TagFilterCheckbox key={tag} excludeTags={rectifiedExcludedTags}
                                              tag={tag} displayed={rectifiedDisplayTags}
                                              setDisplayed={handleSetDisplayTags}
                                              setExcludedTags={handleSetExcludedTags}
                    />
                })
                }
            </div>

            {/*<WorkflowOverviewView filteredTasks={filteredTasks}/>*/}
            <p/>
            <TaskTableView displayWorkflows={displayWorkflows}
                           filteredTasks={filteredTasks}/>

        </>
    )
}

const EmptyWorkflowView = () => {
    // return <label>No Workflow defined. TODO #hint_no_work_flow_defined </label>
    return <h1>No Workflow defined, or Dataview is not initialized.</h1>
}

export function WorkflowTypeLegend({type, style}: { type: WorkflowType } & I_Stylable) {
    return <span style={style}>
        <HStack spacing={3}>
        {getIconViewByWorkflowType(type)}
            <label>{initialToUpper(type)}</label>
    </HStack>
    </span>;
}

export function WorkflowTypeLegendView() {
    return <HStack spacing={10}>
        {Workflow_Type_Enum_Array.map((type: WorkflowType) => {
            return <WorkflowTypeLegend key={type}
                                       type={type}/>

        })}
    </HStack>;
}

const WorkflowFilterHeading = ({displayWorkflowNames, workflows, handleSetDisplayWorkflows}: { displayWorkflowNames: string[], workflows: I_OdaPmWorkflow[], handleSetDisplayWorkflows: (s: string[]) => void }) => {
    return <span style={{display: "flex"}}>
            <HStack style={{
                display: "flex",
                alignItems: "center"
            }} spacing={10}>
                <h2>{displayWorkflowNames.length}/{workflows.length} Workflow(s)</h2>
                <button onClick={() => handleSetDisplayWorkflows(workflows.map(k => k.name))}>Select All
                </button>
                <button onClick={() => handleSetDisplayWorkflows([])}>Unselect All
                </button>
<WorkflowTypeLegendView/>
            </HStack>
            </span>
}

const WorkflowFilterCheckbox = ({workflow, displayWorkflows, setDisplayWorkflows}: {
    workflow: I_OdaPmWorkflow,
    displayWorkflows: string[],
    setDisplayWorkflows: React.Dispatch<React.SetStateAction<string[]>>
}) => {
    const plugin = useContext(PluginContext);

    const wfName = workflow.name;

    function tickCheckbox() {
        // invert the checkbox
        const v = !displayWorkflows.includes(wfName)
        const newArr = v ? [...displayWorkflows, wfName] : displayWorkflows.filter(k => k != wfName)
        setDisplayWorkflows(newArr)
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    return <span style={{display: "inline-block", marginRight: 15}}>
        <ExternalControlledCheckbox
            content={<>
                <InternalLinkView
                    content={<span style={iconViewAsAWholeStyle}>
                        {getIconByWorkflow(workflow)}
                        <label style={{marginLeft: 3}}>{wfName}</label>
                    </span>}
                    onIconClicked={() =>
                        // Go to workflow def
                        openTaskPrecisely(plugin.app.workspace, workflow.boundTask)}
                    onContentClicked={tickCheckbox}/>
            </>}
            onChange={tickCheckbox}
            externalControl={displayWorkflows.includes(wfName)}
        />
    </span>

}

const TagFilterCheckbox = ({tag, displayed, setDisplayed, excludeTags, setExcludedTags}: {
    tag: string,
    displayed: string[],
    excludeTags: string[],
    setDisplayed: React.Dispatch<React.SetStateAction<string[]>>,
    setExcludedTags: React.Dispatch<React.SetStateAction<string[]>>
}) => {
    const tagIncludedIcon = "check"
    const tagExcludedIcon = "x"
    const noTagIcon = "scan"

    // Remove display from excluded and vice versa
    function tickCheckbox() {
        // invert the checkbox
        const excluded = excludeTags.includes(tag)
        const included = displayed.includes(tag);
        const curMethod = included ? FilterMethod_Included : (
            excluded ? FilterMethod_Excluded : FilterMethod_NotFiltering
        );
        const nextMethod = getNextFilterMethod(curMethod);
        const newArr = nextMethod == FilterMethod_Included ? [...displayed, tag] : displayed.filter(k => k != tag)
        setDisplayed(newArr)
        setExcludedTags((
            nextMethod == FilterMethod_Excluded ? [...excludeTags, tag] : excludeTags.filter(k => k != tag))
        )
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    return <span style={{display: "inline-block", margin: 3}}>
        <ClickableIconView style={iconViewAsAWholeStyle} iconName={displayed.includes(tag) ? tagIncludedIcon : (
            excludeTags.includes(tag) ? tagExcludedIcon : noTagIcon
        )}
                           content={<label style={{marginLeft: 5}}>{tag.replace(Tag_Prefix_Tag, "")}</label>}
                           onIconClicked={tickCheckbox}
                           onContentClicked={tickCheckbox}
        />
    </span>

}
/**
 * The first column of the table, which is a checkbox representing the task.
 * @param oTask
 * @param plugin
 * @param taskFirstColumn
 * @constructor
 */
const OdaTaskSummaryCell = ({oTask, taskFirstColumn}: {
    oTask: OdaPmTask,
    taskFirstColumn: I_Renderable
}) => {
    const plugin = useContext(PluginContext);
    const workspace = plugin.app.workspace;

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

    // console.log(`Task: ${oTask.boundTask.text}. Md: ${oTask.isMdCompleted()} ${oTask.stepCompleted()}.`)
    // Changed to ExternalControlledCheckbox. The checkbox status is determined by whether all steps are completed.
    return <HStack spacing={5}>
        {getIconByTask(oTask)}
        <ExternalControlledCheckbox
            content={<span>
                
                <InternalLinkView
                    content={getSettings()?.capitalize_table_row_initial ? initialToUpper(taskFirstColumn) : taskFirstColumn}/>
            </span>}
            onChange={tickSummary}
            onLabelClicked={() => {
                openTaskPrecisely(workspace, oTask.boundTask);
            }}
            externalControl={oTask.stepCompleted()}
        />

    </HStack>;


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

function getIconNameByWorkflowType(type: WorkflowType) {
    return type === "chain" ? "footprints" : "check-check"
}

function getIconViewByWorkflowType(type: WorkflowType) {
    return <ObsidianIconView iconName={getIconNameByWorkflowType(type)}/>;
}

function getIconByWorkflow(workflow: I_OdaPmWorkflow) {
    return getIconViewByWorkflowType(workflow.type);
}

function getIconByTask(oTask: OdaPmTask) {
    return getIconByWorkflow(oTask.type)
}

function TaskTableView({displayWorkflows, filteredTasks}: {
    displayWorkflows: I_OdaPmWorkflow[],
    filteredTasks: DataArray<OdaPmTask>
}) {
    const plugin = useContext(PluginContext);
    const [searchText, setSearchText] = useState("");
    // sort
    const [sortCode, setSortCode] = useState(getSettings()?.table_column_sorting as number); // 0 = unsorted, 1 = asc, 2 = desc
    const nextSortCode = (sortCode + 1) % totalSortMethods;
    // show completed
    const [showCompleted, setShowCompleted] = useState(getSettings()?.show_completed_tasks as boolean);
    const [showSteps, setShowSteps] = useState(getSettings()?.table_steps_shown as boolean);

    function jumpTask(oTask: OdaPmTask) {
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
        eventCenter?.addListener(iPm_JumpTask, jumpTask)
        eventCenter?.addListener(iPm_JumpWorkflow, onJumpToWorkflow)
        return () => {
            eventCenter?.removeListener(iPm_JumpTask, jumpTask)
            eventCenter?.removeListener(iPm_JumpWorkflow, onJumpToWorkflow)
        }
    });

    const displayedTasks = filteredTasks
        .filter(function (k: OdaPmTask) {
            return (showCompleted || !k.isMdCompleted());
        }).filter(function (k: OdaPmTask) {
            return isStringNullOrEmpty(searchText) ? true : simpleFilter(searchText, k);
        })
        .array();
    const ascending = sortCode === SortMethod_Ascending;
    if (sortCode !== SortMethod_Appearance) {
        displayedTasks.sort(
            function (a: OdaPmTask, b: OdaPmTask) {
                // Case-insensitive compare string 
                // a-b = ascending
                if (ascending)
                    return a.summary.localeCompare(b.summary)
                else return b.summary.localeCompare(a.summary)
            }, sortCode
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
    const sumCol = 0;
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

    // add background for table header, according to the theme.
    const container = useContext(ContainerContext)
    const themedBackground = container.getCssPropertyValue("background-color")
    // striped rows. center step cell but not summary cell.
    const evenBg: React.CSSProperties = {backgroundColor: "rgba(0,0,0,0.2)"};
    const oddBg: React.CSSProperties = {};
    const maxSummaryWidth = 500, minSummaryWidth = 300;
    const summaryCellStyle: React.CSSProperties = {
        minWidth: minSummaryWidth,
        maxWidth: maxSummaryWidth,
        padding: 5, paddingLeft: 10
    }
    const summaryEvenCellStyle = {...summaryCellStyle, ...evenBg}
    const summaryOddCellStyle = {...summaryCellStyle, ...oddBg}

    const stepCellStyle: React.CSSProperties = {textAlign: "center"}
    const stepEvenCellStyle = {...stepCellStyle, ...evenBg}
    const stepOddCellStyle = {...stepCellStyle, ...oddBg}

    function taskTableStyleGetter(column: number, row: number): React.CSSProperties {
        const even = row % 2 === 0;
        const cellStyle = even ? stepEvenCellStyle : stepOddCellStyle
        const summaryStyle = even ? summaryEvenCellStyle : summaryOddCellStyle
        if (column === sumCol) {
            return summaryStyle
        } else return cellStyle
    }

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

                        thStyleGetter={(columnIndex: number): React.CSSProperties => {
                            const style = {
                                backgroundColor: themedBackground,
                                position: "sticky", top: -16,
                                padding: 10,
                                minWidth: (columnIndex === sumCol ? minSummaryWidth : "unset"),
                                maxWidth: (columnIndex === sumCol ? maxSummaryWidth : "unset")
                            };
                            // console.log(`thStyleGetter: ${JSON.stringify(style)}`)
                            return style as React.CSSProperties;
                        }}
                        // TODO performance, we instantiate a lot of dictionaries here
                        cellStyleGetter={taskTableStyleGetter}
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
function odaTaskToTableRow(displayStepTags: string[], oTask: OdaPmTask): I_Renderable[] {

    return [`${oTask.summary}`, ...(getSettings()?.table_steps_shown ? odaWorkflowToTableCells(displayStepTags, oTask) : [])];
}

// endregion

// endregion
 