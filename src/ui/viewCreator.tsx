import {
    getDefTags, getOrCreateWorkflow,
    getTypeDefTag,
    I_OdaPmStep, I_OdaPmWorkflow,
    OdaPmTask,

    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "../data-model/workflow_chain";
import {DataArray, getAPI, Literal, STask} from "obsidian-dataview";
import {ButtonComponent, Plugin, Workspace} from "obsidian";
import React, {Fragment, useContext, useEffect, useMemo, useState} from "react";
import {I_Renderable} from "./i_Renderable";

import {rewriteTask} from "../utils/io_util";
import {
    DataviewAPIReadyEvent,
    DataviewMetadataChangeEvent,
    PluginContext
} from "./ManagePageView";
import {EventEmitter} from "events";

const dv = getAPI(); // We can use dv just like the examples in the docs

function createWorkflowFromTask(task: STask): I_OdaPmWorkflow[] {
    const workflows = []
    const defTags = getDefTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getTypeDefTag(wfType);
        if (task.tags.includes(defTag)) {
            const workflow: I_OdaPmWorkflow = getOrCreateWorkflow(wfType, trimTagsFromTask(task));
            workflow.clearSteps()
            for (const tag of task.tags) {
                // exclude def tags. we allow both OdaPmWorkflowType on the same task
                if (defTags.includes(tag)) {
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
            return new OdaPmTask(workflow, task)
        }
    }
    return null;
}

/**
 * @deprecated
 * @param tasks_with_workflow
 * @param workflow
 * @param container
 * @param plugin
 */
function renderTable(tasks_with_workflow: OdaPmTask[], workflow: I_OdaPmWorkflow, container: Element, plugin: Plugin) {
    // find all tasks with this type
    const tasksWithThisType = tasks_with_workflow.filter(function (k: OdaPmTask) {
        return k.type === workflow;
    })

    const taskRows = tasksWithThisType.map(function (k: OdaPmTask) {
        return odaTaskToTableRow(k)
    });
    // console.log(`${data-model.name} has ${taskRows.length} tasks`)
    // TODO use the best practice to create multiple divs
    const tableDiv = container.createEl(`body-${workflow.name}`);
    // const buttonComp = new ButtonComponent(tableDiv)
    // buttonComp.setButtonText("Log Link")
    // buttonComp.onClick(
    //     () => {
    //         console.log(tasksWithThisType[0].boundTask.link) // TODO Is this dataview Link? Yep. But we cannot click it. WHY?
    //     }
    // )
    const stepNames = workflow.stepsDef.map(function (k: I_OdaPmStep) {
        return k.name;
    });
    dv.table(
        [workflow.name, ...stepNames], taskRows, tableDiv, plugin);
}

export function getAllWorkflows() {
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
        .flatMap((task: STask) => createWorkflowFromTask(task));
}

/**
 * @deprecated
 * @param container
 * @param plugin
 */
function viewCreator(container: Element, plugin: Plugin) {

    // const f = await dv.pages() // DataArray<SMarkdownPage[]>, 
    // DataArray supports some linq expressions
    // SMarkdownPage is a page. STask is a task. SListItemBase is a list item.
    // Replace .file.tasks with index access
    const workflows = getAllWorkflows();

    // Vis
    const definitionDiv = container.createEl("div", {text: "Task Types"});
    const bodyDiv = definitionDiv.createEl("body");
    const torender = workflows.map((wf: I_OdaPmWorkflow): Literal => {
        return wf.name;
    })
    dv.list(torender, bodyDiv, plugin);
    // all task def tags
    const task_def_tags = workflows.map(function (k: I_OdaPmWorkflow) {
        return k.tag;
    });
    // all tasks that has a data-model
    const tasks_with_workflow = dv.pages()["file"]["tasks"].where(function (k: STask) {
                for (const defTag of task_def_tags) {
                    if (k.tags.includes(defTag)) return true;
                }
                return false;
            }
        )
            .map((task: STask) => {
                return createPmTaskFromTask(task_def_tags, workflows, task)
            })
    ;
    const filterDiv = definitionDiv.createEl("div", {text: "Filter"});
    // leaf is an Editor tab
    const workspace = plugin.app.workspace;
    // const markdownLeaves = workspace.getLeavesOfType("markdown");
    // const leaf = markdownLeaves[0] // 某一个 Tab
    // // console.log(markdownLeaves) // use "markdown" instead of MarkdownView，holy...!
    // const editor = (leaf.view as MarkdownView).editor;
    // editor.setCursor(25)

    // draw tables
    for (const workflow of workflows) {
        const buttonComp = new ButtonComponent(filterDiv)
        buttonComp.setButtonText("Only show " + workflow.name + " tasks")
        buttonComp.onClick(
            () => {
                //  even if we create the view in the editor tab, the links still cannot be clicked.
                // viewCreator(leaf.view.containerEl, plugin)
            }
        )
        renderTable(tasks_with_workflow, workflow, container, plugin);
    }

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
        console.log(`ReactManagePage rerender triggered. ${rerenderState + 1}`)
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
    const [includeCompleted, setIncludeCompleted] = useState(false);

    const plugin = useContext(PluginContext);
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
        return k.type === currentWorkflow && (includeCompleted || !k.boundTask.checked);
    })
    const tasksArray = tasksWithThisType.array();
    const ascending = sortCode === 1;
    if (sortCode !== 0) {
        tasksArray.sort(
            function (a: OdaPmTask, b: OdaPmTask) {
                // Case-insensitive compare string 
                // a.b = ascending
                if (ascending)
                    return a.summary.localeCompare(b.summary)
                else return b.summary.localeCompare(a.summary)
            }, sortCode
        )
    }

    const taskRows = tasksArray.map(function (k: OdaPmTask) {
        const row = odaTaskToTableRow(k)
        row[0] = (
            <>
                <Checkbox
                    key={k.text}
                    text={row[0]}
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
            </>
        )
        return row;
    });

    console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${tasksWithThisType.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)
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
            <Checkbox text={"Include Completed"} onChanged={
                (nextChecked) => {
                    setIncludeCompleted(nextChecked)
                }
            }
                      initialState={includeCompleted}
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
            <h2> Workflow: {curWfName}</h2>
            <DataTable
                tableTitle={curWfName}
                headers={headers}
                rows={taskRows}
            />
        </>
    )
}

function OdaPmTaskCell({oTask, step}: { oTask: OdaPmTask, step: I_OdaPmStep }) {
    const currentSteps = oTask.currentSteps;
    const plugin = useContext(PluginContext);
    // TODO performance
    const includes = currentSteps.map(m => m.tag).includes(step.tag);
    return <Checkbox
        key={oTask.text + step.tag}
        initialState={includes}
        onChanged={() => {
            // preserve the status, but add or remove the step tag
            const next_status = !includes;
            const next_text = !next_status ?
                oTask.boundTask.text.replace(step.tag, "") :
                `${oTask.boundTask.text} ${step.tag}`; // We believe dataview gives the correct result. In the latter case there will be no step.tag in the original text if includes is false. 
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
        <div>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={handleCheckboxChange}
            />
            <label onClick={onLabelClicked}>

                {text}
            </label>
        </div>
    );
}

// endregion