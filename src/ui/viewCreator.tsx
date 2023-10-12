import {
    getDefTags,
    getTypeDefTag,
    I_OdaPmStep,
    OdaPmTask,
    OdaPmWorkflow,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "../data-model/workflow_chain";
import {getAPI, Literal, STask} from "obsidian-dataview";
import {ButtonComponent, Plugin, Workspace} from "obsidian";
import React, {useMemo, useState} from "react";
import {I_Renderable} from "./i_Renderable";

const dv = getAPI(); // We can use dv just like the examples in the docs
function createWorkflowFromTask(task: STask): OdaPmWorkflow[] {
    const workflows = []
    const defTags = getDefTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getTypeDefTag(wfType);
        if (task.tags.includes(defTag)) {
            const workflow: OdaPmWorkflow = new OdaPmWorkflow(wfType, trimTagsFromTask(task));

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
function createPmTaskFromTask(taskDefTags: string[], taskDefs: OdaPmWorkflow[], task: STask): OdaPmTask | null {
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

function renderTable(tasks_with_workflow: OdaPmTask[], workflow: OdaPmWorkflow, container: Element, plugin: Plugin) {
    // find all tasks with this type
    const tasksWithThisType = tasks_with_workflow.filter(function (k: OdaPmTask) {
        return k.type === workflow;
    })

    const taskRows = tasksWithThisType.map(function (k: OdaPmTask) {
        return k.toTableRow();
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
                console.log(k.tags)
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
    const torender = workflows.map((wf: OdaPmWorkflow): Literal => {
        return wf.name;
    })
    dv.list(torender, bodyDiv, plugin);
    // all task def tags
    const task_def_tags = workflows.map(function (k: OdaPmWorkflow) {
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

export function ReactManagePage({plugin}: { plugin: Plugin }) {
    const workflows = useMemo(getAllWorkflows, []);
    if (workflows.length === 0)
        return <label>No Workflow defined.</label>
    // all tasks that has a data-model
    // Memo to avoid re-compute
    const tasks_with_workflow = useMemo(getAllPmTasks, []);

    function getAllPmTasks() {
        const task_def_tags = workflows.map(function (k: OdaPmWorkflow) {
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

    const [currentWorkflow, setCurrentWorkflow] = useState<OdaPmWorkflow>(null);
    const usingWorkflow = currentWorkflow !== null ? currentWorkflow : workflows[0];
    const workspace = plugin.app.workspace;
    const tasksWithThisType = tasks_with_workflow.filter(function (k: OdaPmTask) {
        return k.type === usingWorkflow;
    })

    const stepNames = usingWorkflow.stepsDef.map(function (k: I_OdaPmStep) {
        return k.name;
    });
    const taskRows = tasksWithThisType.map(function (k: OdaPmTask) {
        const row = k.toTableRow();
        row[0] = (
            <>
                <Checkbox text={row[0]}
                          onChanged={
                              () => {
                                  console.log(k.boundTask)
                              }
                          }
                          onLabelClicked={
                              () => {

                                  // Copy from dataview. See TaskItem.
                                  openTaskPrecisely(workspace, k.boundTask);
                              }
                          }
                />
            </>
        )
        return row;
    });

    // console.log(`ReactManagePage Render. All managed tasks: ${tasksWithThisType.length}. Row count: ${taskRows.length}`)
    return (
        <>
            <h2>Filters</h2>
            {workflows.map((workflow: OdaPmWorkflow) => {
                return (
                    <view key={workflow.name}>
                        <button onClick={() => setCurrentWorkflow(workflow)}>{workflow.name}</button>
                    </view>
                )
            })}
            <h2>Workflow: {usingWorkflow?.name}</h2>
            <DataTable
                tableTitle={usingWorkflow?.name}
                headers={[usingWorkflow.name, ...stepNames]}
                rows={taskRows}
            ></DataTable>
        </>
    )
}

// We cannot interact in Dataview Table, so we create our own.

const DataTable = ({
                       tableTitle,
                       headers, rows
                   }: { tableTitle: string, headers: I_Renderable[], rows: I_Renderable[][] }) => {
    // console.log(rows)
    return (
        <table key={tableTitle}>
            <thead>
            <tr>
                {headers.map((header: string) => {
                    console.log(`header ${header}`)
                    return <th key={header}>{header}</th>;
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
                      text, onChanged, onChecked, onUnchecked,
                      onLabelClicked
                  }: {
                      text: string,
                      onChanged?: () => void,
                      onChecked?: () => void,
                      onUnchecked?: () => void,
                      onLabelClicked?: () => void,
                  }
    ) => {
        const [isChecked, setIsChecked] = useState(false);

        const handleCheckboxChange = () => {
            setIsChecked(!isChecked);
            onChanged?.();
            if (!isChecked)
                onChecked?.();
            else
                onUnchecked?.();
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
;