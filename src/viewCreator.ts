import {
    getDefTags,
    getTypeDefTag,
    I_OdaPmStep,
    OdaPmTask,
    OdaPmWorkflow,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "./workflow/workflow_chain";
import {getAPI, Literal, STask} from "obsidian-dataview";
import {ButtonComponent, Plugin} from "obsidian";

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
    // A task can have only one workflow
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
    // console.log(`${workflow.name} has ${taskRows.length} tasks`)
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

export function viewCreator(container: Element, plugin: Plugin) {

    // const f = await dv.pages() // DataArray<SMarkdownPage[]>, 
    // DataArray supports some linq expressions
    // SMarkdownPage is a page. STask is a task. SListItemBase is a list item.
    // Replace .file.tasks with index access
    const workflows =
        dv.pages()["file"]["tasks"].where(function (k: STask) {
                for (const defTag of getDefTags()) {
                    if (k.tags.includes(defTag)) return true;
                }
                return false;
            }
        )
            .flatMap((task: STask) => createWorkflowFromTask(task))
    ;

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
    // all tasks that has a workflow
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