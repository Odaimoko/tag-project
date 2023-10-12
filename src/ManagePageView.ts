import {ItemView, Plugin, WorkspaceLeaf} from "obsidian";
import {getAPI, Literal, STask} from "obsidian-dataview";
import {
    getDefTags,
    getTypeDefTag, OdaPmStep,
    OdaPmTask,
    OdaPmWorkflow,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "./workflow/workflow_chain";
// https://docs.obsidian.md/Plugins/User+interface/Views
export const ManagePageViewId = "iPm-Tool-ManageView";

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

function createDvEl(container: Element, plugin: Plugin) {

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
    const defitionstDiv = container.createEl("div", {text: "Task Types"});
    let bodyDiv = defitionstDiv.createEl("body");
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
    // draw tables
    for (const workflow of workflows) {
        // find all tasks with this type
        const tasksWithThisType = tasks_with_workflow.filter(function (k: OdaPmTask) {
            return k.type === workflow;
        })

        const taskRows = tasksWithThisType.map(function (k: OdaPmTask) {
            return k.toTableRow();
        });
        console.log(`${workflow.name} has ${taskRows.length} tasks`)
        // TODO use the best practice to create multiple divs
        bodyDiv = container.createEl(`body-${workflow.name}`);

        dv.table(
            [workflow.name, ...workflow.stepsDef.map(function (k: OdaPmStep) {
                return k.name;
            })],
            taskRows, bodyDiv, plugin);
    }
}

export class ManagePageView extends ItemView {

    plugin: Plugin;

    constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return ManagePageViewId;
    }

    getDisplayText() {
        return "Project Management";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", {text: this.getDisplayText()});
        createDvEl(container, this.plugin)
    }

    async onClose() {
        // Nothing to clean up.
    }
}

