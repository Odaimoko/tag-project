import {
    factoryTask,
    getDefTags,
    getOrCreateWorkflow,
    getTypeDefTag,
    getWorkflowNameFromRawText,
    I_OdaPmStep,
    I_OdaPmWorkflow,
    OdaPmTask,
    Tag_Prefix_Step, TaskStatus_checked, TaskStatus_unchecked,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "../data-model/workflow_def";
import {DataArray, getAPI, STask} from "obsidian-dataview";
import {Workspace} from "obsidian";
import React, {Fragment, useContext, useEffect, useMemo, useState} from "react";
import {I_Renderable} from "./i_Renderable";

import {rewriteTask} from "../utils/io_util";
import {PluginContext} from "./manage-page-view";
import {EventEmitter} from "events";
import OdaPmToolPlugin from "../main";
import {ONotice} from "../utils/o-notice";

import {DataviewAPIReadyEvent, DataviewMetadataChangeEvent} from "../typing/dataview-event";
import {initialToUpper, isStringNullOrEmpty, simpleFilter} from "../utils/format_util";
import {setSettingsValueAndSave} from "../Settings";
import {Checkbox, DataTable, ExternalControlledCheckbox, HStack, InternalLinkView} from "./view-template";

const dv = getAPI(); // We can use dv just like the examples in the docs
let pmPlugin: OdaPmToolPlugin; // locally global

function notifyMalformedTask(task: STask) {
    // console.log(pmPlugin && pmPlugin.settings.report_malformed_task)
    if (pmPlugin && pmPlugin.settings.report_malformed_task)
        new ONotice(getTaskMalformedMsg(task))
}

function getTaskMalformedMsg(task: STask) {
    return `Task is not valid for PM.\nYou can disable this popup in settings.\n\nSee Task:\n\t${task.text}`
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
                notifyMalformedTask(task)
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
            const oTask = factoryTask(task, workflow);
            if (oTask === null) {
                notifyMalformedTask(task)
            }
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

    // place all hooks before return. React doesn't allow the order to be changed.
    const workflows = useMemo(getAllWorkflows, [rerenderState]);

    // const [currentWorkflow, setCurrentWorkflow] = useState<I_OdaPmWorkflow>(workflows[0]);
    const [displayWorkflows, setDisplayWorkflows] = useState<I_OdaPmWorkflow[]>([]);
    const plugin = useContext(PluginContext);
    pmPlugin = plugin;

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
        return k.boundTask.checked;
    });
    const completedCount = completedTasks.length;

    // console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${tasksWithThisType.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)

    return (
        <>
            <HStack style={{alignItems: "center"}} spacing={10}>
                <h2>{workflows.length} Workflow(s)</h2>
                <button onClick={() => setDisplayWorkflows([...workflows])}>Select All
                </button>
                <button onClick={() => setDisplayWorkflows([])}>Unselect All
                </button>
            </HStack>
            {workflows.map((workflow: I_OdaPmWorkflow) => {
                return (
                    <WorkflowFilterCheckbox key={workflow.name} displayWorkflows={displayWorkflows} workflow={workflow}
                                            setDisplayWorkflows={setDisplayWorkflows}/>
                )
            })}
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

    return <ExternalControlledCheckbox
        content={<InternalLinkView content={workflow.name} onIconClicked={() =>
            // Go to workflow def
            openTaskPrecisely(plugin.app.workspace, workflow.boundTask)}
                                   onContentClicked={tickCheckbox}/>}
        onChange={tickCheckbox}
        externalControl={displayWorkflows.includes(workflow)}
    />

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

        // 	 State: all ticked. Behaviour: untick summary. Outcome: nothing. 

        if (!oTask.allStepsCompleted()) {
            // k.boundTask.checked = !k.boundTask.checked// No good, this is dataview cache.

            // - State: unticked. Behaviour: tick summary. Outcome: All steps ticked.
            const nextStatus = TaskStatus_checked;
            let oriText = oTask.text;
            for (const step of oTask.type.stepsDef) {
                if (oTask.currentSteps.includes(step)) {
                    continue;
                }
                oriText = addStepTagToNonTaggedText(oriText, step.tag)
            }
            rewriteTask(plugin.app.vault, oTask.boundTask,
                nextStatus, oriText) // trigger rerender
        }
    }

    // Changed to ExternalControlledCheckbox. The checkbox status is determined by whether all steps are completed.
    return <>
        <ExternalControlledCheckbox
            content={<InternalLinkView
                content={plugin.settings.capitalize_table_row_initial ? initialToUpper(taskFirstColumn) : taskFirstColumn}/>}
            onChange={tickSummary}
            onLabelClicked={() => {
                openTaskPrecisely(workspace, oTask.boundTask);
            }}
            externalControl={oTask.allStepsCompleted()}
        />
    </>;


};

function TaskCheckboxTableView({displayWorkflows, tasksWithThisType}: {
    displayWorkflows: I_OdaPmWorkflow[],
    tasksWithThisType: DataArray<OdaPmTask>
}) {
    const plugin = useContext(PluginContext);
    const [searchText, setSearchText] = useState("");
    const [sortCode, setSortCode] = useState(0); // 0 = unsorted, 1 = asc, 2 = desc
    const [includeCompleted, setIncludeCompleted] = useState(plugin.settings.include_completed_tasks as boolean);
    // sort
    const totalSortMethods = 3;
    const nextSortCode = (sortCode + 1) % totalSortMethods;
    const displayedTasks = tasksWithThisType.filter(function (k: OdaPmTask) {
        return (includeCompleted || !k.boundTask.checked);
    }).filter(function (k: OdaPmTask) {
        return isStringNullOrEmpty(searchText) ? true : simpleFilter(searchText, k);
    })
        .array();
    const ascending = sortCode === 1;
    if (sortCode !== 0) {
        displayedTasks.sort(
            function (a: OdaPmTask, b: OdaPmTask) {
                // Case-insensitive compare string 
                // a.b = ascending
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
                <>
                    <input
                        type="text" // You can change the "type" attribute for different input types
                        value={searchText}
                        placeholder={"Search task name..."}
                        onChange={(evt) => {
                            setSearchText(evt.target.value)
                        }}
                    />
                </>
                <><label> Sort </label>
                    <button onClick={
                        () => {
                            // Loop
                            setSortCode(nextSortCode)
                        }
                    }
                    >
                        {sortCode === 0 ? "By Appearance" : ascending ? "Ascending" : "Descending"}
                    </button>
                </>
                <Checkbox content={"Show Completed"} onChange={
                    (nextChecked) => {
                        setIncludeCompleted(nextChecked)
                        setSettingsValueAndSave(plugin, "include_completed_tasks", nextChecked)
                    }
                }
                          initialState={includeCompleted}
                />
            </HStack>
            <p/>
            {
                displayWorkflows.length === 0 ? <label>No Workflow selected.</label> : (
                    taskRows.length > 0 ? <DataTable
                        tableTitle={curWfName}
                        headers={headers}
                        rows={taskRows}
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
            <HStack style={{alignItems: "center"}} spacing={10}>
                <h2>
                    Workflow: {workflows.map(k => `${k.name} (${initialToUpper(k.type)})`).join(", ")}
                </h2>
                <></>
            </HStack>
            <label style={labelColorStype}>{completedCount}/{totalCount} tasks
                completed: {ratioString}%.</label>
        </>
    )
}


function addStepTagToNonTaggedText(text: any, stepTag: string) {
    // With the rule that a task cannot cross multiple lines, we can safely assume that the last char is \n if there is a \n.
    const hasTrailingEol = text.indexOf("\n") == text.length - 1
    // We believe dataview gives the correct result. In the latter case there will be no step.tag in the original text if includes is false.
    return `${text.trimEnd()} ${stepTag}` + (hasTrailingEol ? "\n" : "");
}

function addStepTagToTaskText(oTask: OdaPmTask, stepTag: string): string {
    const text = oTask.boundTask.text;
    return addStepTagToNonTaggedText(text, stepTag);
}

function OdaPmStepCell({oTask, stepTag}: {
    oTask: OdaPmTask,
    stepTag: string
}) {
    const plugin = useContext(PluginContext);
    // TODO performance
    // If this workflow does not need this step, we show nothing.
    if (!oTask.type.stepsDef.map(k => k.tag).includes(stepTag))
        return <></>
    // Otherwise, we show a checkbox showing if current task completes this step.
    const includes = oTask.currentSteps.map(k => k.tag).includes(stepTag);

    // Automatically  complete the parent task when checking in manage page 
    function tickStep() {
        // preserve the status, but add or remove the step tag
        const next_status = !includes;
        // remove the tag when untick the checkbox, or add the tag when tick the checkbox
        const next_text = !next_status ?
            oTask.boundTask.text.replace(stepTag, "") :
            addStepTagToTaskText(oTask, stepTag)

        // State: all ticked. Behaviour: untick step. Outcome: untick the summary.
        //  State: unticked. Behaviour: tick step. Outcome: if all steps are ticked, tick the summary.
        const fromTickedToUnticked = oTask.allStepsCompleted() && !next_status;
        const nextStatus = fromTickedToUnticked ? TaskStatus_unchecked : (
                oTask.lackOnlyOneStep(stepTag) ? TaskStatus_checked
                    : oTask.boundTask.status
            )
        ;

        rewriteTask(plugin.app.vault, oTask.boundTask,
            nextStatus, next_text)

    }

    return <ExternalControlledCheckbox
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
 