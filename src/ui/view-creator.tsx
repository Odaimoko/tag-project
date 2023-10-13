import {
    factoryTask,
    getDefTags, getOrCreateWorkflow,
    getTypeDefTag, getWorkflowNameFromRawText,
    I_OdaPmStep, I_OdaPmWorkflow,
    OdaPmTask, Tag_Prefix_Step,

    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "../data-model/workflow_def";
import {DataArray, getAPI, STask} from "obsidian-dataview";
import {Workspace} from "obsidian";
import React, {Fragment, useContext, useEffect, useMemo, useState} from "react";
import {I_Renderable} from "./i_Renderable";

import {rewriteTask} from "../utils/io_util";
import {
    PluginContext
} from "./manage-page-view";
import {EventEmitter} from "events";
import OdaPmToolPlugin from "../main";
import {ONotice} from "../utils/o-notice";

import {DataviewAPIReadyEvent, DataviewMetadataChangeEvent} from "../typing/dataview-event";
import {initialToUpper, isStringNullOrEmpty, simpleFilter} from "../utils/format_util";
import {setSettingsValueAndSave} from "../Settings";

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


export function ReactManagePage({eventCenter}: { eventCenter?: EventEmitter }) {
    // only for re-render
    const [rerenderState, setRerenderState] = useState(0);

    function triggerRerender() {
        // console.log(`ReactManagePage rerender triggered. ${rerenderState + 1}`)
        setRerenderState((prevState) => prevState + 1)
    }

    // How to prevent add listener multiple times? use custom emitter instead of obsidian's event emitter
    useEffect(() => {
        eventCenter?.addListener(DataviewMetadataChangeEvent, triggerRerender)

        return () => {
            eventCenter?.removeListener(DataviewMetadataChangeEvent, triggerRerender)
        }
    }, [rerenderState]);

    useEffect(() => {
        eventCenter?.addListener(DataviewAPIReadyEvent, triggerRerender)

        return () => {
            eventCenter?.removeListener(DataviewAPIReadyEvent, triggerRerender)
        }
    }, [rerenderState]);

    // place all hooks before return. React doesn't allow the order to be changed.
    const workflows = useMemo(getAllWorkflows, [rerenderState]);

    const [currentWorkflow, setCurrentWorkflow] = useState<I_OdaPmWorkflow>(workflows[0]);

    const plugin = useContext(PluginContext);
    // Init here
    pmPlugin = plugin;

    const [includeCompleted, setIncludeCompleted] = useState(plugin.settings.include_completed_tasks as boolean);
    const [searchText, setSearchText] = useState("");

    // all tasks that has a workflow
    // Memo to avoid re-compute
    const tasks_with_workflow = useMemo(getAllPmTasks, [rerenderState]);
    const [sortCode, setSortCode] = useState(0); // 0 = unsorted, 1 = asc, 2 = desc

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
        return <label>No Workflow defined.</label>


    const workspace = plugin.app.workspace;
    if (!currentWorkflow) {
        setCurrentWorkflow(workflows[0])
        // We return here because if current workflow is not initialized, we cannot get the stepsDef, TypeError will be thrown.
        // Remember React will re-render after this whole function (and further component calls). It won't stop at setState calls.
        return null
    }
    const stepNames = currentWorkflow.stepsDef.map(function (k: I_OdaPmStep) {
        return k.name;
    });

    const curWfName = currentWorkflow?.name;
    const headers = [curWfName, ...stepNames];

    // sort
    const totalSortMethods = 3;
    const nextSortCode = (sortCode + 1) % totalSortMethods;

    // Here we use reference equality to filter tasks. Using reference is prone to bugs since we tend to new a lot in js, but using string id is memory consuming. Trade-off.
    const tasksWithThisType: DataArray<OdaPmTask> = tasks_with_workflow.filter(function (k: OdaPmTask) {
        return k.type === currentWorkflow;
    })
    const totalCount = tasksWithThisType.length;
    const completedTasks = tasksWithThisType.filter(function (k: OdaPmTask) {
        return k.boundTask.checked;
    });
    const completedCount = completedTasks.length;

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


    const taskRows = displayedTasks.map(function (k: OdaPmTask) {
        const row = odaTaskToTableRow(k)
        row[0] = (
            <Fragment key={`${k.boundTask.path}:${k.boundTask.line}`}>
                <Checkbox

                    text={plugin.settings.capitalize_table_row_initial ? initialToUpper(row[0]) : row[0]}
                    onChanged={
                        () => {
                            // k.boundTask.checked = !k.boundTask.checked// No good, this is dataview cache.
                            const nextStatus = k.boundTask.checked ? " " : "x";
                            // TODO performace
                            rewriteTask(plugin.app.vault, k.boundTask,
                                nextStatus)
                        }
                    }
                    onLabelClicked={
                        () => {
                            openTaskPrecisely(workspace, k.boundTask);
                        }
                    }
                    initialState={k.boundTask.checked}
                />
            </Fragment>
        )
        return row;
    });

    // console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${tasksWithThisType.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)

    return (
        <>
            <h2>{workflows.length} Filter(s)</h2>
            {workflows.map((workflow: I_OdaPmWorkflow) => {
                return (
                    <Fragment key={workflow.name}>
                        <button onClick={() => setCurrentWorkflow(workflow)}>{workflow.name}</button>
                    </Fragment>
                )
            })}

            <WorkflowView workflow={currentWorkflow} completedCount={completedCount} totalCount={totalCount}/>
            <div>
                <input
                    type="text" // You can change the "type" attribute for different input types
                    value={searchText}
                    onChange={(evt) => {
                        setSearchText(evt.target.value)
                    }}
                />
                <label> Sort </label>
                <button onClick={
                    () => {
                        // Loop
                        setSortCode(nextSortCode)
                    }
                }
                >
                    {sortCode === 0 ? "By Appearance" : ascending ? "Ascending" : "Descending"}
                </button>
                <Checkbox text={"Include Completed"} onChanged={
                    (nextChecked) => {
                        setIncludeCompleted(nextChecked)
                        setSettingsValueAndSave(plugin, "include_completed_tasks", nextChecked)
                    }
                }
                          initialState={includeCompleted}
                />
            </div>

            {taskRows.length > 0 ? <DataTable
                tableTitle={curWfName}
                headers={headers}
                rows={taskRows}
            /> : <label>No results.</label>}
        </>
    )
}

//  region Custom View
function WorkflowView({workflow, completedCount = 0, totalCount = 0}: { workflow: I_OdaPmWorkflow, completedCount?: number, totalCount?: number }) {
    const wfName = workflow?.name;
    const completionRate = totalCount === 0 ? "100" : (completedCount / totalCount * 100).toFixed(2);
    const plugin = useContext(PluginContext);
    return (
        <>
            <h2> Workflow: {wfName}.
                <button onClick={() =>
                    openTaskPrecisely(plugin.app.workspace, workflow.boundTask)
                }>Go to Workflow Definition
                </button>
            </h2>
            <label>Completion: {completedCount}/{totalCount}, {completionRate}%</label>
        </>
    )
}


function addStepTagToTaskText(oTask: OdaPmTask, stepTag: string): string {
    const text = oTask.boundTask.text;
    // With the rule that a task cannot cross multiple lines, we can safely assume that the last char is \n if there is a \n.
    const hasTrailingEol = text.indexOf("\n") == text.length - 1
    // We believe dataview gives the correct result. In the latter case there will be no step.tag in the original text if includes is false.
    return `${text.trimEnd()} ${stepTag}` + (hasTrailingEol ? "\n" : "");
}

function OdaPmTaskCell({oTask, step}: { oTask: OdaPmTask, step: I_OdaPmStep }) {
    const currentSteps = oTask.currentSteps;
    const plugin = useContext(PluginContext);
    // TODO performance
    const stepTag = step.tag;
    const includes = currentSteps.map(m => m.tag).includes(stepTag);
    return <Checkbox
        key={oTask.text + stepTag}
        initialState={includes}
        onChanged={() => {
            // preserve the status, but add or remove the step tag
            const next_status = !includes;

            const next_text = !next_status ?
                oTask.boundTask.text.replace(stepTag, "") :
                addStepTagToTaskText(oTask, stepTag)
            rewriteTask(plugin.app.vault, oTask.boundTask,
                oTask.boundTask.status, next_text)
        }}
    />
}


// For checkbox
function odaWorkflowToTableCells(oTask: OdaPmTask) {
    const workflow: I_OdaPmWorkflow = oTask.type;
    return [...workflow.stepsDef.map((step: I_OdaPmStep) => {
        return <OdaPmTaskCell key={step.name} oTask={oTask} step={step}/>
    })]
}

// For checkbox  
// region Workflow Ui wrapper
function odaTaskToTableRow(oTask: OdaPmTask): I_Renderable[] {

    return [`${oTask.summary}`, ...odaWorkflowToTableCells(oTask)]
}

// endregion

// endregion

//region View definitions
// We cannot interact in Dataview Table, so we create our own.

const DataTable = ({
                       tableTitle,
                       headers, rows,
                       onHeaderClicked
                   }: {
    tableTitle: string, headers: I_Renderable[], rows: I_Renderable[][],
    onHeaderClicked?: (arg0: number) => void
}) => {

    return (
        <table key={tableTitle}>
            <thead>
            <tr>
                {headers.map((header: string, index) => {
                    return <th key={header}>
                        <div onClick={() => {
                            onHeaderClicked?.(index)
                        }}>{header}</div>
                    </th>;
                })}
            </tr>
            </thead>
            <tbody>
            {rows.map((items, rowIdx) => (
                <tr key={rowIdx}>
                    {items.map(
                        function (k, columnIdx) {
                            const key = `${tableTitle}_${rowIdx}_${columnIdx}`;
                            return <td key={key}>{k}</td>;
                        }
                    )}
                </tr>))
            }
            </tbody>
        </table>
    );
}


const Checkbox = ({
                      text, onChanged,
                      onLabelClicked,
                      initialState = false
                  }: {
    text?: string,
    onChanged?: (nextChecked: boolean) => void,
                      onLabelClicked?: () => void,
                      initialState?: boolean
                  }
) => {
    const [isChecked, setIsChecked] = useState(initialState);

    const handleCheckboxChange = () => {
        setIsChecked(!isChecked);
        onChanged?.(!isChecked);
    };
    // Click the label won't trigger the checkbox change event
    return (
        <Fragment>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={handleCheckboxChange}
            />
            <label onClick={onLabelClicked}>
                {text}
            </label>
        </Fragment>
    );
}

// endregion