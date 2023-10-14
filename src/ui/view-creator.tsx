import {
    factoryTask,
    getDefTags,
    getOrCreateWorkflow,
    getTypeDefTag,
    getWorkflowNameFromRawText,
    I_OdaPmStep,
    I_OdaPmWorkflow,
    isTaskSingleLine,
    isTaskSummaryValid,
    OdaPmTask,
    Tag_Prefix_Step,
    TaskStatus_checked,
    TaskStatus_unchecked,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "../data-model/workflow_def";
import {DataArray, getAPI, STask} from "obsidian-dataview";
import {Workspace} from "obsidian";
import React, {useContext, useEffect, useMemo, useState} from "react";
import {I_Renderable} from "./i_Renderable";

import {rewriteTask} from "../utils/io_util";
import {PluginContext} from "./manage-page-view";
import {EventEmitter} from "events";
import OdaPmToolPlugin from "../main";
import {notify, ONotice} from "../utils/o-notice";

import {DataviewAPIReadyEvent, DataviewMetadataChangeEvent} from "../typing/dataview-event";
import {initialToUpper, isStringNullOrEmpty, simpleFilter} from "../utils/format_util";
import {setSettingsValueAndSave, SortMethod_Appearance, SortMethod_Ascending, totalSortMethods} from "../Settings";
import {
    Checkbox,
    ClickableIconView,
    DataTable,
    ExternalControlledCheckbox,
    HStack,
    I_Stylable,
    InternalLinkView
} from "./view-template";
import {appendBoldText} from "./html-template";


const dv = getAPI(); // We can use dv just like the examples in the docs
let pmPlugin: OdaPmToolPlugin; // locally global

// dark light compatible
export const Color_WorkflowChain = "#6289bb"
export const Color_Workflow_Checkbox = "#5eb95f"

function getColorByWorkflow(type: I_OdaPmWorkflow) {
    switch (type.type) {
        case "chain":
            return Color_WorkflowChain;
        case "checkbox" :
            return Color_Workflow_Checkbox;
    }
    return "currentColor"
}

function notifyMalformedTask(task: STask, msgGetter: (task: STask) => string) {
    // console.log(pmPlugin && pmPlugin.settings.report_malformed_task)
    if (pmPlugin && pmPlugin.settings.report_malformed_task)
        new ONotice(msgGetter(task), 4)
}

function getTaskMultiLineErrMsg(task: STask) {
    return `Task cannot have multiple lines.\nYou can disable this popup in settings.\n\nSee Task:\n\t${task.text}`
}


/**
 * Create workflows from one task. Do not process multiple definitions across different tasks.
 * @param task
 */
function createWorkflowsFromTask(task: STask): I_OdaPmWorkflow[] {
    const workflows = []
    const defTags = getDefTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getTypeDefTag(wfType);
        if (task.tags.includes(defTag)) {

            const workflow = getOrCreateWorkflow(wfType, getWorkflowNameFromRawText(trimTagsFromTask(task)), task);
            if (workflow === null) {
                notifyMalformedTask(task, getTaskMultiLineErrMsg)
                continue;
            }
            workflow.boundTask = task // Override task
            workflow.type = wfType // override 

            // The latter found workflow overrides the former one's steps, but not the STask.
            workflow.clearSteps()
            for (const tag of task.tags) {
                // exclude def tags. we allow both OdaPmWorkflowType on the same task
                if (defTags.includes(tag) || !tag.startsWith(Tag_Prefix_Step)) {
                    continue;
                }
                workflow.addStep(tag)
            }
            workflows.push(workflow)
        }
    }

    return workflows;
}

// Create an OdaPmTask from a STask
function createPmTaskFromTask(taskDefTags: string[], taskDefs: I_OdaPmWorkflow[], task: STask): OdaPmTask | null {
    // A task can have only one data-model
    for (let i = 0; i < taskDefTags.length; i++) {
        const defTag = taskDefTags[i];
        if (task.tags.includes(defTag)) {
            const workflow = taskDefs[i];
            if (!isTaskSingleLine(task)) {
                notifyMalformedTask(task, getTaskMultiLineErrMsg)
                continue;
            } else if (!isTaskSummaryValid(task)) {
                notifyMalformedTask(task, (t) => `Task summary cannot be empty.\nYou can disable this popup in settings.\n\nSee Task:\n\t${t.text}`)
                continue;
            }
            const oTask = factoryTask(task, workflow);

            return oTask
        }
    }
    return null;
}

export function getAllWorkflows(): I_OdaPmWorkflow[] {

    return dv.pages()["file"]["tasks"].where(function (k: STask) {
            for (const defTag of getDefTags()) {
                if (k.tags.length === 0) continue;
                if (k.tags.includes(defTag)) {
                    return true;
                }
            }
            return false;
        }
    )
        .flatMap((task: STask) => createWorkflowsFromTask(task))
        .array()
        .unique();
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

    // How to prevent add listener multiple times? use custom emitter instead of obsidian's event emitter
    useEffect(() => {
        eventCenter?.addListener(DataviewMetadataChangeEvent, triggerRerender)
        eventCenter?.addListener(DataviewAPIReadyEvent, triggerRerender)

        return () => {
            eventCenter?.removeListener(DataviewMetadataChangeEvent, triggerRerender)
            eventCenter?.removeListener(DataviewAPIReadyEvent, triggerRerender)
        }
    }, [rerenderState]);

    const plugin = useContext(PluginContext);
    pmPlugin = plugin;

    // place all hooks before return. React doesn't allow the order to be changed.
    const workflows = useMemo(getAllWorkflows, [rerenderState]);

    // const [currentWorkflow, setCurrentWorkflow] = useState<I_OdaPmWorkflow>(workflows[0]);
    const [displayWorkflows, setDisplayWorkflows] = useState<I_OdaPmWorkflow[]>(
        workflows.filter(k => {
            return plugin.settings.display_workflow_names?.includes(k.name);
        })
    );

    function handleSetDisplayWorkflows(newArr: I_OdaPmWorkflow[]) {
        setSettingsValueAndSave(plugin, "display_workflow_names", newArr.map(k => k.name))
        setDisplayWorkflows(newArr)
    }


    // all tasks that has a workflow
    // Memo to avoid re-compute
    const tasks_with_workflow = useMemo(getAllPmTasks, [rerenderState]);

    function getAllPmTasks() {
        const task_def_tags = workflows.map(function (k: I_OdaPmWorkflow) {
            return k.tag;
        });
        return dv.pages()["file"]["tasks"].where(function (k: STask) {
                for (const defTag of task_def_tags) {
                    if (k.tags.includes(defTag)) return true;
                }
                return false;
            }
        )
            .map((task: STask) => {
                return createPmTaskFromTask(task_def_tags, workflows, task)
            }).filter(function (k: OdaPmTask | null) {
                return k !== null;
            })
            ;
    }

    if (workflows.length === 0)
        return <label>No Workflow defined. TODO #hint_no_work_flow_defined </label>


    // Here we use reference equality to filter tasks. Using reference is prone to bugs since we tend to new a lot in js, but using string id is memory consuming. Trade-off.
    const tasksWithThisType: DataArray<OdaPmTask> = tasks_with_workflow.filter(function (k: OdaPmTask) {
        return displayWorkflows.includes(k.type);
    })
    const totalCount = tasksWithThisType.length;
    const completedTasks = tasksWithThisType.filter(function (k: OdaPmTask) {
        return k.isMdCompleted();
    });
    const completedCount = completedTasks.length;

    // console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${tasksWithThisType.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)

    return (
        <>
            <HStack style={{alignItems: "center"}} spacing={10}>
                <h2>{workflows.length} Workflow(s)</h2>
                <button onClick={() => handleSetDisplayWorkflows([...workflows])}>Select All
                </button>
                <button onClick={() => handleSetDisplayWorkflows([])}>Unselect All
                </button>
            </HStack>
            <div>
                {workflows.map((workflow: I_OdaPmWorkflow) => {
                    return (
                        <WorkflowFilterCheckbox key={workflow.name} displayWorkflows={displayWorkflows}
                                                workflow={workflow}
                                                setDisplayWorkflows={handleSetDisplayWorkflows}/>
                    )
                })}
            </div>
            <WorkflowView workflows={displayWorkflows} completedCount={completedCount} totalCount={totalCount}/>
            <p/>
            <TaskCheckboxTableView displayWorkflows={displayWorkflows} tasksWithThisType={tasksWithThisType}/>

        </>
    )
}

const WorkflowFilterCheckbox = ({workflow, displayWorkflows, setDisplayWorkflows}: {
    workflow: I_OdaPmWorkflow,
    displayWorkflows: I_OdaPmWorkflow[],
    setDisplayWorkflows: React.Dispatch<React.SetStateAction<I_OdaPmWorkflow[]>>
}) => {
    const plugin = useContext(PluginContext);

    function tickCheckbox() {
        // invert the checkbox
        const v = !displayWorkflows.includes(workflow)
        const newArr = v ? [...displayWorkflows, workflow] : displayWorkflows.filter(k => k != workflow)
        setDisplayWorkflows(newArr)
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    return <span style={{display: "inline-block", margin: 3}}>
        <ExternalControlledCheckbox
            content={<InternalLinkView
                content={<label style={{color: getColorByWorkflow(workflow)}}>{workflow.name}</label>}
                onIconClicked={() =>
                    // Go to workflow def
                    openTaskPrecisely(plugin.app.workspace, workflow.boundTask)}
                onContentClicked={tickCheckbox}/>}
            onChange={tickCheckbox}
            externalControl={displayWorkflows.includes(workflow)}
        />
    </span>

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
    return <>
        <ExternalControlledCheckbox
            content={<InternalLinkView
                content={plugin.settings.capitalize_table_row_initial ? initialToUpper(taskFirstColumn) : taskFirstColumn}/>}
            onChange={tickSummary}
            onLabelClicked={() => {
                openTaskPrecisely(workspace, oTask.boundTask);
            }}
            externalControl={oTask.stepCompleted()}
        />
    </>;


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

function TaskCheckboxTableView({displayWorkflows, tasksWithThisType}: {
    displayWorkflows: I_OdaPmWorkflow[],
    tasksWithThisType: DataArray<OdaPmTask>
}) {
    const plugin = useContext(PluginContext);
    const [searchText, setSearchText] = useState("");
    // sort
    const [sortCode, setSortCode] = useState(plugin.settings.table_column_sorting as number); // 0 = unsorted, 1 = asc, 2 = desc
    const nextSortCode = (sortCode + 1) % totalSortMethods;
    // show completed
    const [showCompleted, setShowCompleted] = useState(plugin.settings.show_completed_tasks as boolean);

    const displayedTasks = tasksWithThisType.filter(function (k: OdaPmTask) {
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

    const curWfName = displayWorkflows.map(k => k.name).join(", ")
    const headers = [curWfName, ...displayStepNames];


    const taskRows = displayedTasks.map(function (oTask: OdaPmTask) {
        const row = odaTaskToTableRow(displayStepTags, oTask)
        // console.log(`${oTask.boundTask.text.split(" ").first()}. Md: ${oTask.isMdCompleted()}. Step: ${oTask.stepCompleted()}.`)
        rectifyOdaTaskOnMdTaskChanged(oTask, plugin);

        row[0] = (
            <OdaTaskSummaryCell key={`${oTask.boundTask.path}:${oTask.boundTask.line}`} oTask={oTask}
                                taskFirstColumn={row[0]}/>
        )
        return row;
    });

    return (
        <>
            <HStack style={{
                justifyContent: "flex-start",
                alignItems: "center"
            }} spacing={15}>
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
                <HStack style={{alignItems: "center"}}>
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
                <Checkbox content={"Show Completed"} onChange={
                    (nextChecked) => {
                        setShowCompleted(nextChecked)
                        setSettingsValueAndSave(plugin, "show_completed_tasks", nextChecked)
                    }
                }
                          initialState={showCompleted}
                />
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
                        thStyle={{position: "sticky", top: -16}}
                    /> : <label>No results.</label>
                )
            }
        </>
    )

}

//  region Custom View
function WorkflowView({workflows, completedCount = 0, totalCount = 0}: {
    workflows: I_OdaPmWorkflow[],
    completedCount?: number,
    totalCount?: number
}) {
    // const wfName = workflow?.name;
    const completeRatio = completedCount / totalCount;
    const ratioString = totalCount === 0 ? "100" : (completeRatio * 100).toFixed(2);
    if (workflows.length === 0) return <></>

    let color = null
    if (!isNaN(completeRatio)) {
        if (completeRatio >= 0.8)
            color = "green"
        else if (completeRatio >= 0.5)
            color = "orange"
    }
    const labelColorStype = isStringNullOrEmpty(color) ? {} : {color: color} as React.CSSProperties;
    return (<>
            {/*<HStack style={{alignItems: "center"}} spacing={10}>*/}
            {/*    <h2>*/}
            {/*        Workflow: {workflows.map(k => `${k.name} (${initialToUpper(k.type)})`).join(", ")}*/}
            {/*    </h2>*/}
            {/*    <></>*/}
            {/*</HStack>*/}
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

    return [`${oTask.summary}`, ...odaWorkflowToTableCells(displayStepTags, oTask)]
}

// endregion

// endregion
 